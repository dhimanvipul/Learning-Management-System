const Notification = require("./notification.model");
const User = require("../auth/auth.model");
const Student = require("../students/student.model");
const Instructor = require("../instructors/instructor.model");
const { emitNotification } = require("../../utils/socket");

// Clients tracking for SSE
let clients = [];

// Get Notifications for a user (filters by userId + receiverId + targetRole + broadcasts)
const getNotifications = async (req, res) => {
  try {
    const { userId, role } = req.query;

    let filter = {};

    if (userId) {
      // Resolve auth ID from profile ID (student/instructor have separate profile IDs)
      const [student, instructor] = await Promise.all([
        Student.findById(userId).catch(() => null),
        Instructor.findById(userId).catch(() => null),
      ]);

      const email = student?.email || instructor?.email;
      let authId = userId;
      if (email) {
        const user = await User.findOne({ email });
        if (user) authId = user._id.toString();
      }

      const orConditions = [
        { userId: userId },
        { userId: authId },
        { receiverId: userId },
        { receiverId: authId },
        { userId: null, targetRole: null }, // Global broadcasts
      ];

      // Role-targeted notifications
      if (role) {
        orConditions.push({ targetRole: role });
        orConditions.push({ targetRole: "all" });
      }

      filter.$or = orConditions;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create Notification (Internal Function)
const createNotification = async (
  title,
  message,
  type = "system",
  userId = null,
  link = "",
  targetRole = null,
  extraFields = {}
) => {
  try {
    const createdNotif = await Notification.create({
      title,
      message,
      type,
      userId,
      receiverId: userId,
      link,
      targetRole,
      ...extraFields,
    });

    // Emit live Socket.IO notification
    emitNotification(createdNotif);

    // Broadcast to SSE clients
    const eventPayload = {
      _id: createdNotif._id,
      title,
      message,
      type,
      userId,
      receiverId: userId,
      senderId: createdNotif.senderId || null,
      senderRole: createdNotif.senderRole || "",
      icon: createdNotif.icon || "",
      relatedId: createdNotif.relatedId || null,
      link,
      targetRole,
      isRead: false,
      createdAt: createdNotif.createdAt,
    };

    clients.forEach((client) => {
      const userMatch = !userId || !client.userId || client.userId === userId?.toString();
      const roleMatch = !targetRole || targetRole === "all" || client.role === targetRole;
      if (userMatch && roleMatch) {
        try {
          client.res.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
        } catch (e) {
          console.error("Error writing to SSE client:", e.message);
        }
      }
    });

    return createdNotif;
  } catch (err) {
    console.error("createNotification error:", err.message);
  }
};

// Stream Notifications via SSE
const streamNotifications = (req, res) => {
  const { userId, role } = req.query;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const heartbeat = setInterval(() => {
    res.write(":\n\n");
  }, 20000);

  const newClient = { userId: userId || null, role: role || null, res };
  clients.push(newClient);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients = clients.filter((c) => c.res !== res);
  });
};

// Mark One As Read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark All Read for a user
const markAllRead = async (req, res) => {
  try {
    const { userId } = req.body;
    let filter = {};
    if (userId) {
      // Resolve auth ID from profile ID
      const [student, instructor] = await Promise.all([
        Student.findById(userId).catch(() => null),
        Instructor.findById(userId).catch(() => null),
      ]);

      const email = student?.email || instructor?.email;
      let authId = userId;
      if (email) {
        const user = await User.findOne({ email });
        if (user) authId = user._id.toString();
      }

      filter = {
        $or: [
          { userId: userId },
          { userId: authId },
          { receiverId: userId },
          { receiverId: authId },
          { userId: null }
        ]
      };
    }
    await Notification.updateMany(filter, { isRead: true });
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Notification
const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Unread Count for a user/role
const getUnreadCount = async (req, res) => {
  try {
    const { userId, role } = req.query;
    if (!userId) {
      return res.status(200).json({ success: true, count: 0 });
    }

    // Resolve auth ID from profile ID
    const [student, instructor] = await Promise.all([
      Student.findById(userId).catch(() => null),
      Instructor.findById(userId).catch(() => null),
    ]);

    const email = student?.email || instructor?.email;
    let authId = userId;
    if (email) {
      const user = await User.findOne({ email });
      if (user) authId = user._id.toString();
    }

    const orConditions = [
      { userId: userId },
      { userId: authId },
      { receiverId: userId },
      { receiverId: authId },
      { userId: null, targetRole: null }
    ];

    if (role) {
      orConditions.push({ targetRole: role });
      orConditions.push({ targetRole: "all" });
    }

    const count = await Notification.countDocuments({
      $or: orConditions,
      isRead: false
    });

    res.status(200).json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  streamNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
};