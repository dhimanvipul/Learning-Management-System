import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiBookOpen, FiMessageCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import socketService from "../../services/socketService";
import chatService from "../../services/chatService";
import ChatDrawer from "../../components/Common/ChatDrawer";
import "./MyCourses.css";

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // { instructorId: count }

  const chatPartnerRef = useRef(null);
  const coursesRef = useRef([]);

  useEffect(() => {
    chatPartnerRef.current = chatPartner;
  }, [chatPartner]);

  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(user);

    // Request browser notification permissions
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Connect socket for real-time chat
    if (user) {
      socketService.connect(user._id, user.role);
    }

    const fetchCourses = async () => {
      try {
        if (!user?._id) return;
        const res = await fetch(`http://localhost:5000/api/enrollments/student/${user._id}`);
        const result = await res.json();
        const data = result.data || [];
        setCourses(data);

        // Fetch conversations to load initial unread badges
        const convRes = await chatService.getConversations(user._id, user.role);
        if (convRes.success) {
          const countsMap = {};
          convRes.data.forEach(conv => {
            if (conv.instructorId) {
              countsMap[conv.instructorId._id.toString()] = conv.unreadCount || 0;
            }
          });
          setUnreadCounts(countsMap);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchCourses();
  }, []);

  // Listen to global socket messages for badges and toasts
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleGlobalNewMessage = (msg) => {
      // Only handle incoming messages from instructors
      if (msg.senderModel === "Instructor") {
        const senderId = msg.sender.toString();
        const activePartner = chatPartnerRef.current;
        const isDrawerOpenForSender = activePartner && activePartner._id === senderId;

        if (!isDrawerOpenForSender) {
          // Increment unread count badge
          setUnreadCounts(prev => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1
          }));

          // Find instructor in courses list
          const matched = coursesRef.current.find(c => c.instructorId?._id?.toString() === senderId);
          const senderName = matched?.instructorId?.name || "Your instructor";

          // Play notification sound / show toast
          toast.info(`💬 New message from ${senderName}: "${msg.text || "Attachment"}"`, {
            onClick: () => {
              if (matched && matched.instructorId) {
                setChatPartner({
                  _id: matched.instructorId._id,
                  name: matched.instructorId.name,
                  profileImage: matched.instructorId.profileImage || "",
                  role: "instructor"
                });
              }
            }
          });

          // Show browser notification if tab is inactive
          if (document.hidden && Notification.permission === "granted") {
            new Notification(`💬 SkillVerse LMS`, {
              body: `New message from ${senderName}: ${msg.text || "Attachment"}`,
              icon: matched?.instructorId?.profileImage || "/logo192.png"
            });
          }
        }
      }
    };

    socket.on("newMessage", handleGlobalNewMessage);
    return () => {
      socket.off("newMessage", handleGlobalNewMessage);
    };
  }, []);

  // Clear badge when opening drawer
  useEffect(() => {
    if (chatPartner) {
      setUnreadCounts(prev => ({
        ...prev,
        [chatPartner._id.toString()]: 0
      }));
    }
  }, [chatPartner]);

  const handleChatWithInstructor = (enrollment) => {
    const instructorObj = enrollment.instructorId;
    const courseInstructorObj = enrollment.courseId?.instructorId;
    
    let instructorId = "";
    let instructorName = "Instructor";
    let instructorAvatar = "";

    if (instructorObj && typeof instructorObj === "object") {
      instructorId = instructorObj._id;
      instructorName = instructorObj.name || instructorName;
      instructorAvatar = instructorObj.profileImage || "";
    } else if (instructorObj && typeof instructorObj === "string") {
      instructorId = instructorObj;
    }

    if (!instructorId && courseInstructorObj) {
      if (typeof courseInstructorObj === "object") {
        instructorId = courseInstructorObj._id;
        instructorName = courseInstructorObj.name || instructorName;
        instructorAvatar = courseInstructorObj.profileImage || "";
      } else if (typeof courseInstructorObj === "string") {
        instructorId = courseInstructorObj;
      }
    }

    if (!instructorId) {
      alert("Instructor information not available for this course.");
      return;
    }

    setChatPartner({
      _id: instructorId,
      name: instructorName,
      profileImage: instructorAvatar,
      role: "instructor"
    });
  };

  return (
    <div className="mycourses-page">
      <div className="page-header">
        <h1>My Courses</h1>
        <p>Your enrolled courses — continue learning or chat with your instructor</p>
      </div>

      {!Array.isArray(courses) || courses.length === 0 ? (
        <div className="empty-card">
          <h3>No Courses Assigned</h3>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((enrollment) => {
            const rawInstructor = enrollment.instructorId;
            const instructorId = rawInstructor && typeof rawInstructor === "object"
              ? rawInstructor._id?.toString()
              : (rawInstructor?.toString() || enrollment.courseId?.instructorId?._id?.toString() || enrollment.courseId?.instructorId?.toString() || "");
            const badgeCount = unreadCounts[instructorId] || 0;
            return (
              <div className="course-card" key={enrollment._id}>
                <div className="course-top">

                  <div className="course-icon">
                    <FiBookOpen />
                  </div>
                  <div>
                    <h3>{enrollment.courseId?.title}</h3>
                    <p>Progress: {enrollment.progress || 0}%</p>
                  </div>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${enrollment.progress || 0}%` }}
                  />
                </div>

                <div className="course-card-actions">
                  <button
                    className="continue-btn"
                    onClick={() => navigate(`/student/courses/${enrollment.courseId?._id}`)}
                  >
                    Continue Learning
                  </button>

                  {enrollment.instructorId && (
                    <button
                      className="chat-instructor-btn"
                      onClick={() => handleChatWithInstructor(enrollment)}
                      title={`Chat with ${enrollment.instructorId?.name || "Instructor"}`}
                      style={{ position: "relative" }}
                    >
                      <FiMessageCircle size={15} />
                      <span>Chat with Instructor</span>
                      {badgeCount > 0 && (
                        <span className="chat-badge-count">{badgeCount}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chat Drawer */}
      {chatPartner && currentUser && (
        <ChatDrawer
          partnerInfo={chatPartner}
          currentUser={currentUser}
          onClose={() => setChatPartner(null)}
        />
      )}
    </div>
  );
};

export default MyCourses;