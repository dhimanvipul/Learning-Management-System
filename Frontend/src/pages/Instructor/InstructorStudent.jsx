import React, { useEffect, useState, useRef } from "react";
import { 
  FiUsers, FiBook, FiSearch, FiMessageCircle,
  FiTrendingUp, FiActivity, FiChevronLeft, FiChevronRight, FiCheckCircle 
} from "react-icons/fi";
import { toast } from "react-toastify";
import enrollmentService from "../../services/enrollmentService";
import socketService from "../../services/socketService";
import chatService from "../../services/chatService";
import Spinner from "../../components/Common/Spinner";
import ChatDrawer from "../../components/Common/ChatDrawer";
import "./InstructorStudent.css";

const InstructorStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Chat state
  const [chatPartner, setChatPartner] = useState(null); // { _id, name, profileImage }
  const [unreadCounts, setUnreadCounts] = useState({}); // { studentId: count }

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const chatPartnerRef = useRef(null);
  const studentsRef = useRef([]);

  useEffect(() => {
    chatPartnerRef.current = chatPartner;
  }, [chatPartner]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

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

    const queryParams = new URLSearchParams(window.location.search);
    const courseIdParam = queryParams.get("courseId");
    if (courseIdParam) setSelectedCourse(courseIdParam);

    loadStudents(user);
  }, []);

  // Listen to global socket messages for badges and toasts
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleGlobalNewMessage = (msg) => {
      // Only handle incoming messages from students
      if (msg.senderModel === "Student") {
        const senderId = msg.sender.toString();
        const activePartner = chatPartnerRef.current;
        const isDrawerOpenForSender = activePartner && activePartner._id === senderId;

        if (!isDrawerOpenForSender) {
          // Increment unread count badge
          setUnreadCounts(prev => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1
          }));

          // Find student in list
          const matched = studentsRef.current.find(s => s.studentId?._id?.toString() === senderId);
          const senderName = matched?.studentId?.name || "A student";

          // Play notification sound / show toast
          toast.info(`💬 New message from ${senderName}: "${msg.text || "Attachment"}"`, {
            onClick: () => {
              if (matched) {
                setChatPartner({
                  _id: matched.studentId?._id,
                  name: matched.studentId?.name,
                  profileImage: matched.studentId?.profileImage || "",
                  role: "student"
                });
              }
            }
          });

          // Show browser notification if tab is inactive
          if (document.hidden && Notification.permission === "granted") {
            new Notification(`💬 SkillVerse LMS`, {
              body: `New message from ${senderName}: ${msg.text || "Attachment"}`,
              icon: matched?.studentId?.profileImage || "/logo192.png"
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

  const loadStudents = async (user) => {
    try {
      setLoading(true);
      const currentUserObj = user || JSON.parse(localStorage.getItem("user"));
      const instructorId = currentUserObj?.instructorId || currentUserObj?._id;
      
      const data = await enrollmentService.getInstructorStudents(instructorId);
      setStudents(data);

      // Extract unique courses
      const courseMap = {};
      data.forEach(item => {
        if (item.courseId) courseMap[item.courseId._id] = item.courseId.title;
      });
      setCourses(Object.keys(courseMap).map(id => ({ _id: id, title: courseMap[id] })));

      // Fetch conversations to load initial unread badges
      if (currentUserObj) {
        const convRes = await chatService.getConversations(currentUserObj._id, currentUserObj.role);
        if (convRes.success) {
          const countsMap = {};
          convRes.data.forEach(conv => {
            if (conv.studentId) {
              countsMap[conv.studentId._id.toString()] = conv.unreadCount || 0;
            }
          });
          setUnreadCounts(countsMap);
        }
      }
    } catch (err) {
      console.error("Error loading students:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter student list
  const filteredStudents = students.filter((item) => {
    const matchesSearch =
      item.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.studentId?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === "all" || item.courseId?._id === selectedCourse;
    let matchesStatus = true;
    if (selectedStatus !== "all") {
      const isDone = item.progress === 100;
      matchesStatus = selectedStatus === "completed" ? isDone : !isDone;
    }
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const currentItems = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalEnrolled = students.length;
  const activeStudents = students.filter(s => s.progress < 100).length;
  const completedStudents = students.filter(s => s.progress === 100).length;
  const averageProgress = students.length > 0
    ? Math.round(students.reduce((acc, curr) => acc + (curr.progress || 0), 0) / students.length) : 0;

  if (loading) return <div className="student-loading-wrapper"><Spinner /></div>;

  return (
    <div className="instructor-students-container">
      <div className="students-page-header">
        <div>
          <h1>👨‍🎓 My Students</h1>
          <p>Supervise, analyze progress, and chat with your enrolled students.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="students-stats-grid">
        <div className="students-stat-card">
          <div className="stat-icon-container gold"><FiUsers size={20} /></div>
          <div className="stat-content"><h3>{totalEnrolled}</h3><p>Total Enrolled</p></div>
        </div>
        <div className="students-stat-card">
          <div className="stat-icon-container active"><FiActivity size={20} /></div>
          <div className="stat-content"><h3>{activeStudents}</h3><p>Active Learners</p></div>
        </div>
        <div className="students-stat-card">
          <div className="stat-icon-container completed"><FiCheckCircle size={20} /></div>
          <div className="stat-content"><h3>{completedStudents}</h3><p>Graduates</p></div>
        </div>
        <div className="students-stat-card">
          <div className="stat-icon-container progress-stat"><FiTrendingUp size={20} /></div>
          <div className="stat-content"><h3>{averageProgress}%</h3><p>Average Progress</p></div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="students-filters-toolbar">
        <div className="students-search-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="students-filters-group">
          <div className="filter-select-wrapper">
            <FiBook className="filter-icon" />
            <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Courses</option>
              {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
          <div className="filter-select-wrapper">
            <FiActivity className="filter-icon" />
            <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="students-table-wrapper">
        {currentItems.length === 0 ? (
          <div className="empty-students-state">
            <FiUsers size={48} className="empty-icon" />
            <h3>No Students Found</h3>
            <p>No records match your search or filters.</p>
          </div>
        ) : (
          <>
            <table className="students-dashboard-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email Address</th>
                  <th>Course Title</th>
                  <th>Course Progress</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => {
                  const isCompleted = item.progress === 100;
                  const studentId = item.studentId?._id?.toString();
                  const badgeCount = unreadCounts[studentId] || 0;
                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="student-profile-badge">
                          <div className="student-avatar-badge">
                            {item.studentId?.profileImage
                              ? <img src={item.studentId.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                              : item.studentId?.name?.charAt(0) || "S"
                            }
                          </div>
                          <div className="student-info-name">{item.studentId?.name || "LMS Student"}</div>
                        </div>
                      </td>
                      <td><span className="student-email-cell">{item.studentId?.email || "—"}</span></td>
                      <td><span className="course-title-cell">{item.courseId?.title || "Course"}</span></td>
                      <td>
                        <div className="student-progress-bar-column">
                          <div className="progress-value-label">{item.progress}%</div>
                          <div className="progress-bar-bg-small">
                            <div className="progress-bar-fill-small" style={{ width: `${item.progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`student-status-badge ${isCompleted ? "complete" : "active"}`}>
                          {isCompleted ? "Completed" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="student-quick-actions">
                          <button
                            className="action-icon-btn chat"
                            title={`Chat with ${item.studentId?.name}`}
                            onClick={() => setChatPartner({
                              _id: item.studentId?._id,
                              name: item.studentId?.name,
                              profileImage: item.studentId?.profileImage || "",
                              role: "student"
                            })}
                            style={{ position: "relative" }}
                          >
                            <FiMessageCircle size={14} />
                            <span>Chat</span>
                            {badgeCount > 0 && (
                              <span className="chat-badge-count">{badgeCount}</span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="students-pagination">
                <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <FiChevronLeft size={16} /><span>Previous</span>
                </button>
                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-number-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >{page}</button>
                  ))}
                </div>
                <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <span>Next</span><FiChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

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

export default InstructorStudents;