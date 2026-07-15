import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiBell,
  FiSearch,
  FiUser,
  FiSettings,
  FiChevronDown,
  FiBook,
  FiCheckSquare,
  FiFileText,
  FiAward,
  FiEdit,
  FiUploadCloud,
  FiCheckCircle,
  FiDollarSign,
  FiMessageSquare,
  FiTrash2,
} from "react-icons/fi";
import "./Navbar.css";
import notificationService from "../../services/notificationService";
import { ThemeContext } from "../../context/ThemeContext";
import io from "socket.io-client";
import searchService from "../../services/searchService";


const pageTitles = {
  "/": "Dashboard",
  "/admin": "Dashboard",
  "/admin/students": "Students",
  "/admin/courses": "Courses",
  "/admin/instructors": "Instructors",
  "/admin/enrollments": "Enrollments",
  "/admin/payments": "Payment History",
  "/admin/reports": "Reports",
  "/student": "Dashboard",
  "/student/explore": "Explore Courses",
  "/student/courses": "My Courses",
  "/student/progress": "Progress",
  "/student/profile": "Profile",
  "/instructor": "Dashboard",
  "/instructor/courses": "My Courses",
  "/instructor/students": "Students",
  "/instructor/profile": "Profile",
  "/instructor/reports": "Reports",
};

const getNotificationIcon = (type) => {
  switch (type) {
    case "student": return <FiUser className="notif-icon" />;
    case "course": return <FiBook className="notif-icon" />;
    case "enrollment": return <FiCheckSquare className="notif-icon" />;
    case "lesson": return <FiFileText className="notif-icon" />;
    case "instructor": return <FiAward className="notif-icon" />;
    case "assignment": return <FiEdit className="notif-icon" />;
    case "submission": return <FiUploadCloud className="notif-icon" />;
    case "grade": return <FiCheckCircle className="notif-icon" />;
    case "certificate": return <FiAward className="notif-icon" />;
    case "payment": return <FiDollarSign className="notif-icon" />;
    case "chat": return <FiMessageSquare className="notif-icon" />;
    default: return <FiBell className="notif-icon" />;
  }
};

const formatRelativeTime = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    if (diffMs < 0) return "Just now";
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  } catch (e) {
    return "";
  }
};

const Navbar = ({ onMenuClick }) => {
  const { theme, setTheme } = useContext(ThemeContext);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    students: [],
    courses: [],
    instructors: [],
    assignments: [],
    enrollments: [],
  });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const loadNotifications = async (userId, role) => {
    try {
      const res = await notificationService.getNotifications(userId, role);
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.log("Error loading notifications:", err);
    }
  };

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    setUser(currentUser);

    const userId = currentUser?._id;
    loadNotifications(userId, currentUser?.role);

    // Socket.IO live stream connection
    const socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    if (currentUser) {
      socket.emit("join", { userId: currentUser._id, role: currentUser.role });
    }

    socket.on("notification", (newNotif) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === newNotif._id)) return prev;
        return [newNotif, ...prev];
      });
    });

    const handleUserUpdate = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user"));
      setUser(updatedUser);
    };
    window.addEventListener("userUpdate", handleUserUpdate);

    return () => {
      socket.disconnect();
      window.removeEventListener("userUpdate", handleUserUpdate);
    };
  }, []);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({
        students: [],
        courses: [],
        instructors: [],
        assignments: [],
        enrollments: [],
      });
      setShowSearchDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const data = await searchService.globalSearch(searchQuery);
      setSearchResults(data);
      setShowSearchDropdown(true);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".navbar-search-container")) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchResultClick = (item, type) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    const role = user?.role;

    if (type === "student") {
      if (role === "admin") {
        navigate(`/admin/students/${item._id}`);
      } else if (role === "instructor") {
        navigate(`/instructor/students`);
      }
    } else if (type === "course") {
      if (role === "admin") {
        navigate(`/admin/courses/${item._id}/content`);
      } else if (role === "instructor") {
        navigate(`/instructor/courses`);
      } else if (role === "student") {
        navigate(`/student/course/${item._id}`);
      }
    } else if (type === "instructor") {
      if (role === "admin") {
        navigate(`/admin/instructors`);
      }
    } else if (type === "assignment") {
      if (role === "admin") {
        navigate(`/admin/courses`);
      } else if (role === "instructor") {
        navigate(`/instructor/courses`);
      }
    } else if (type === "enrollment") {
      if (role === "admin") {
        navigate(`/admin/enrollments`);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const types = ["student", "course", "instructor", "assignment", "enrollment"];
      for (const t of types) {
        const list = searchResults[t + "s"] || [];
        if (list.length > 0) {
          handleSearchResultClick(list[0], t);
          break;
        }
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const title = pageTitles[location.pathname] || "LMS Panel";

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead(user?._id);
      loadNotifications(user?._id, user?.role);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      loadNotifications(user?._id, user?.role);
    } catch (err) {
      console.log(err);
    }
  };

  const handleNotificationClick = async (item) => {
    try {
      if (!item.isRead) {
        await notificationService.markAsRead(item._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
      }
      setShowNotifications(false);
      if (item.link) {
        navigate(item.link);
      }
    } catch (err) {
      console.error("Error clicking notification:", err);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <FiMenu size={22} />
        </button>
        <div className="navbar-title">
          <h1>{title}</h1>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-search-container">
          <div className="navbar-search">
            <FiSearch size={16} />
            <input
              type="text"
              placeholder="Quick search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearchDropdown(true);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          {showSearchDropdown && (
            <div className="search-results-dropdown">
              {Object.keys(searchResults).every((key) => searchResults[key].length === 0) ? (
                <div className="search-no-results">No matches found</div>
              ) : (
                <>
                  {searchResults.students.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Students</div>
                      {searchResults.students.map((item) => (
                        <div
                          key={item._id}
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(item, "student")}
                        >
                          <span className="search-item-primary">{item.name}</span>
                          <span className="search-item-secondary">{item.email}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.courses.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Courses</div>
                      {searchResults.courses.map((item) => (
                        <div
                          key={item._id}
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(item, "course")}
                        >
                          <span className="search-item-primary">{item.title}</span>
                          <span className="search-item-secondary">{item.code || "-"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.instructors.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Instructors</div>
                      {searchResults.instructors.map((item) => (
                        <div
                          key={item._id}
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(item, "instructor")}
                        >
                          <span className="search-item-primary">{item.name}</span>
                          <span className="search-item-secondary">{item.subject || item.email}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.assignments.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Assignments</div>
                      {searchResults.assignments.map((item) => (
                        <div
                          key={item._id}
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(item, "assignment")}
                        >
                          <span className="search-item-primary">{item.title}</span>
                          <span className="search-item-secondary">{item.dueDate ? `Due: ${new Date(item.dueDate).toLocaleDateString()}` : "No due date"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.enrollments.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Enrollments</div>
                      {searchResults.enrollments.map((item) => (
                        <div
                          key={item._id}
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(item, "enrollment")}
                        >
                          <span className="search-item-primary">{item.studentId?.name}</span>
                          <span className="search-item-secondary">Enrolled in {item.courseId?.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="notification-wrapper">
          <button
            className="icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <FiBell size={19} />

            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="notif-dot">
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">

              <div className="notification-header">
                <h4>Notifications</h4>

                <button
                  className="mark-read-btn"
                  onClick={handleMarkAllRead}
                >
                  Mark All Read
                </button>
              </div>

               {notifications.length === 0 ? (
                <p className="empty-notification">
                  No Notifications
                </p>
              ) : (
                <>
                  <div className="notification-list-scroll" style={{ maxHeight: "320px", overflowY: "auto" }}>
                    {notifications.slice(0, visibleCount).map((item) => (
                      <div
                        key={item._id}
                        className={`notification-item ${
                          item.isRead ? "read" : ""
                        }`}
                        onClick={() => handleNotificationClick(item)}
                      >
                        <div className="notif-icon-container">
                          {getNotificationIcon(item.type)}
                        </div>
                        <div className="notif-content" style={{ flex: 1 }}>
                          <p>{item.title}</p>
                          <span>{item.message}</span>
                          <small className="notif-time" style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                            {formatRelativeTime(item.createdAt)}
                          </small>
                        </div>

                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item._id);
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                  {notifications.length > visibleCount && (
                    <div className="notification-dropdown-footer" style={{ padding: "10px 18px", borderTop: "1px solid var(--notif-border)", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                      <button
                        className="load-more-btn"
                        style={{ border: "none", background: "none", color: "var(--color-gold)", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                        onClick={() => setVisibleCount((prev) => prev + 5)}
                      >
                        Load More
                      </button>
                      <button
                        className="view-all-btn"
                        style={{ border: "none", background: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                        onClick={() => setVisibleCount(notifications.length)}
                      >
                        View All
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          )}
        </div>

        <div className="profile-wrapper">
          <div
            className="navbar-profile"
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="navbar-avatar">
              {user?.avatar || user?.profileImage ? (
                <img src={user.avatar || user.profileImage} alt="Avatar" />
              ) : (
                user?.name?.charAt(0) || user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"
              )}
            </div>

            <div className="profile-info">
              <p className="profile-name">{user?.name || user?.username || "SkillVerse User"}</p>
              <p className="profile-role">{user?.role?.toUpperCase() || "Member"}</p>
            </div>
          </div>

          {showProfile && (
            <div className="profile-dropdown">
              <button
                className="profile-menu-item"
                onClick={() => {
                  const rolePath = user?.role === "admin" ? "/admin/profile" : user?.role === "instructor" ? "/instructor/profile" : "/student/profile";
                  navigate(rolePath);
                  setShowProfile(false);
                }}
              >
                <FiUser size={16} />
                <span>My Profile</span>
              </button>

              <div className="profile-menu-item-nested">
                <div className="menu-item-header">
                  <FiSettings size={16} />
                  <span>Appearance</span>
                </div>
                <div className="appearance-toggle-group">
                  <button
                    className={`appearance-toggle-btn ${theme === "light" ? "active" : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    Light Mode
                  </button>
                  <button
                    className={`appearance-toggle-btn ${theme === "dark" ? "active" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    Dark Mode
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
