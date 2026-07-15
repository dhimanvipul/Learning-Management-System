const Conversation = require("./conversation.model");
const Message = require("./message.model");
const Enrollment = require("../enrollments/enrollment.model");
const uploadToCloudinary = require("../../utils/cloudinaryUpload");
const { getIO } = require("../../utils/socket");



// ================================================================
//  Helper — check if student is enrolled in instructor's course
//  We check via Enrollment using studentId only, then verify instructorId
// ================================================================
const checkChatAuthorization = async (studentId, instructorId) => {
  try {
    // Find any enrollment where this student is enrolled in a course that belongs to this instructor
    const enrollment = await Enrollment.findOne({
      studentId: studentId,
      $or: [
        { instructorId: instructorId },
        { instructorId: { $exists: false } }
      ]
    });

    if (enrollment) return true;

    // Fallback: check via course's instructor field
    const Course = require("../courses/course.model");
    const courses = await Course.find({ instructorId: instructorId });
    const courseIds = courses.map(c => c._id);

    if (courseIds.length === 0) return false;

    const anyEnrollment = await Enrollment.findOne({
      studentId: studentId,
      courseId: { $in: courseIds }
    });

    return !!anyEnrollment;
  } catch (err) {
    console.error("checkChatAuthorization error:", err);
    // Allow chat if we can't verify (don't block due to data issues)
    return true;
  }
};

// 1. Get all conversations for a user
const getConversations = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.query.userId;
    const role = req.headers["x-user-role"] || req.query.role;

    if (!userId || !role) {
      return res.status(400).json({ success: false, error: "User ID and Role required" });
    }

    let query = {};
    if (role === "student") query.studentId = userId;
    else if (role === "instructor") query.instructorId = userId;
    else return res.status(403).json({ success: false, error: "Only students and instructors can chat" });

    const conversations = await Conversation.find(query)
      .populate("studentId", "name email profileImage")
      .populate("instructorId", "name email profileImage subject")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: userId },
          isRead: false
        });
        return { ...conv.toObject(), unreadCount };
      })
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("getConversations error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Get messages for a conversation
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.headers["x-user-id"] || req.query.userId;

    if (!conversationId) {
      return res.status(400).json({ success: false, error: "conversationId required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    // Verify participant — use string comparison
    const studentIdStr = conversation.studentId.toString();
    const instructorIdStr = conversation.instructorId.toString();
    const userIdStr = userId.toString();

    if (studentIdStr !== userIdStr && instructorIdStr !== userIdStr) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    // Mark messages from other participant as read
    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, isRead: false },
      { $set: { isRead: true } }
    );

    // Emit read receipts via socket
    const io = getIO();
    if (io) {
      const recipientId = studentIdStr === userIdStr ? instructorIdStr : studentIdStr;
      io.to(recipientId).emit("messagesRead", { conversationId, readBy: userIdStr });
    }

    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error("getMessages error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Send a message
const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, fileUrl, fileName, fileType } = req.body;
    const userId = (req.headers["x-user-id"] || req.body.userId || "").toString().trim();
    const role = (req.headers["x-user-role"] || req.body.role || "").toString().trim();

    if (!conversationId) {
      return res.status(400).json({ success: false, error: "conversationId is required" });
    }
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }
    if (!text && !fileUrl) {
      return res.status(400).json({ success: false, error: "Message text or file is required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    const studentIdStr = conversation.studentId.toString();
    const instructorIdStr = conversation.instructorId.toString();

    if (studentIdStr !== userId && instructorIdStr !== userId) {
      return res.status(403).json({
        success: false,
        error: `Access denied. userId=${userId}, studentId=${studentIdStr}, instructorId=${instructorIdStr}`
      });
    }

    const senderModel = role === "student" ? "Student" : "Instructor";

    const newMessage = await Message.create({
      conversationId,
      sender: userId,
      senderModel,
      text: text || "",
      fileUrl: fileUrl || "",
      fileName: fileName || "",
      fileType: fileType || "",
      isRead: false,
      delivered: true
    });

    // Update conversation's lastMessage and timestamp
    conversation.lastMessage = newMessage._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Emit via Socket.IO to both participants
    const io = getIO();
    if (io) {
      const recipientId = studentIdStr === userId ? instructorIdStr : studentIdStr;
      const payload = newMessage.toObject();

      // Emit to sender (for multi-tab support)
      io.to(userId).emit("newMessage", payload);
      // Emit to recipient
      io.to(recipientId).emit("newMessage", payload);

      console.log(`📨 Message emitted: ${userId} → ${recipientId}, text="${text}"`);
    }

    // Trigger notification to recipient
    try {
      const User = require("../auth/auth.model");
      const Student = require("../students/student.model");
      const Instructor = require("../instructors/instructor.model");
      const { createNotification } = require("../notifications/notification.controller");

      let senderProfileName = "Someone";
      let recipientEmail = "";

      if (role === "student") {
        const studentInfo = await Student.findById(userId);
        senderProfileName = studentInfo?.name || "Student";
        const instInfo = await Instructor.findById(instructorIdStr);
        recipientEmail = instInfo?.email;
      } else {
        const instInfo = await Instructor.findById(userId);
        senderProfileName = instInfo?.name || "Instructor";
        const studentInfo = await Student.findById(studentIdStr);
        recipientEmail = studentInfo?.email;
      }

      if (recipientEmail) {
        const recipientUser = await User.findOne({ email: recipientEmail });
        if (recipientUser) {
          await createNotification(
            role === "student" ? "New Message from Student" : "New Message from Instructor",
            `You received a new message from ${senderProfileName}: "${text || "Attachment"}"`,
            "chat",
            recipientUser._id,
            role === "student" ? "/instructor/students" : "/student/my-courses",
            null,
            {
              senderId: userId,
              senderRole: role,
              icon: "chat",
              relatedId: conversation._id
            }
          );
        }
      }
    } catch (notifErr) {
      console.error("Failed to generate chat notification:", notifErr.message);
    }

    return res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Start or retrieve a conversation (no duplicate creation)
const startConversation = async (req, res) => {
  try {
    const { studentId, instructorId } = req.body;

    if (!studentId || !instructorId) {
      return res.status(400).json({ success: false, error: "studentId and instructorId are required" });
    }

    // Check authorization
    const isAuthorized = await checkChatAuthorization(studentId, instructorId);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: "Not authorized. Student must be enrolled in a course taught by this instructor."
      });
    }

    // Find or create conversation atomically
    let conversation = await Conversation.findOne({ studentId, instructorId })
      .populate("studentId", "name email profileImage")
      .populate("instructorId", "name email profileImage subject");

    if (!conversation) {
      const created = await Conversation.create({ studentId, instructorId });
      conversation = await Conversation.findById(created._id)
        .populate("studentId", "name email profileImage")
        .populate("instructorId", "name email profileImage subject");
    }

    return res.json({ success: true, data: conversation });
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      const conv = await Conversation.findOne({ studentId: req.body.studentId, instructorId: req.body.instructorId })
        .populate("studentId", "name email profileImage")
        .populate("instructorId", "name email profileImage subject");
      return res.json({ success: true, data: conv });
    }
    console.error("startConversation error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Get chat partners
const getChatPartners = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.query.userId;
    const role = req.headers["x-user-role"] || req.query.role;

    if (!userId || !role) {
      return res.status(400).json({ success: false, error: "userId and role required" });
    }

    let partners = [];
    if (role === "student") {
      const enrollments = await Enrollment.find({ studentId: userId })
        .populate("instructorId", "name email profileImage subject");
      const map = {};
      enrollments.forEach(e => {
        if (e.instructorId) map[e.instructorId._id.toString()] = e.instructorId;
      });
      partners = Object.values(map);
    } else if (role === "instructor") {
      const enrollments = await Enrollment.find({ instructorId: userId })
        .populate("studentId", "name email profileImage");
      const map = {};
      enrollments.forEach(e => {
        if (e.studentId) map[e.studentId._id.toString()] = e.studentId;
      });
      partners = Object.values(map);
    }

    return res.json({ success: true, data: partners });
  } catch (error) {
    console.error("getChatPartners error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 6. Upload attachment
const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    const result = await uploadToCloudinary(req.file, "chat_attachments", "auto");
    return res.json({
      success: true,
      data: {
        secure_url: result.secure_url,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error("uploadAttachment error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  getChatPartners,
  uploadAttachment
};
