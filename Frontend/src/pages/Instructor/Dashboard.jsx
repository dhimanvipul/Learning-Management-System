import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiUsers,
  FiActivity,
  FiFileText,
  FiAlertCircle,
  FiCalendar,
  FiClock,
  FiArrowRight,
  FiTrendingUp,
  FiUser,
} from "react-icons/fi";
import instructorService from "../../services/instructorService";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeCourses: 0,
    totalAssignments: 0,
    pendingReviews: 0,
    recentStudents: [],
    recentAssignments: [],
  });

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user._id) {
        setError("User session not found. Please login again.");
        return;
      }
      const data = await instructorService.getDashboardStats(user._id);
      setStats(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard statistics. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatDate = () => {
    return time.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = () => {
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spinner label="Loading Instructor Dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <ErrorState message={error} onRetry={loadStats} />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Card & Live Clock */}
      <div className="welcome-banner">
        <div className="welcome-message">
          <h1>Welcome Back, <span className="instructor-highlight">Instructor</span> 👋</h1>
          <p>Here is what's happening with your courses and students today.</p>
        </div>
        <div className="live-clock-card">
          <div className="clock-time">
            <FiClock className="clock-icon" />
            <span>{formatTime()}</span>
          </div>
          <div className="clock-date">
            <FiCalendar className="date-icon" />
            <span>{formatDate()}</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid-instructor">
        <div className="metric-card gold-border">
          <div className="metric-icon-wrapper gold-bg">
            <FiBookOpen className="metric-icon" />
          </div>
          <div className="metric-info">
            <h3>{stats.totalCourses}</h3>
            <p>Total Courses</p>
          </div>
        </div>

        <div className="metric-card gold-border">
          <div className="metric-icon-wrapper gold-bg">
            <FiUsers className="metric-icon" />
          </div>
          <div className="metric-info">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>

        <div className="metric-card gold-border">
          <div className="metric-icon-wrapper gold-bg">
            <FiActivity className="metric-icon" />
          </div>
          <div className="metric-info">
            <h3>{stats.activeCourses}</h3>
            <p>Active Courses</p>
          </div>
        </div>

        <div className="metric-card gold-border">
          <div className="metric-icon-wrapper gold-bg">
            <FiFileText className="metric-icon" />
          </div>
          <div className="metric-info">
            <h3>{stats.totalAssignments}</h3>
            <p>Total Assignments</p>
          </div>
        </div>

        <div className="metric-card gold-border">
          <div className="metric-icon-wrapper gold-bg">
            <FiAlertCircle className="metric-icon" />
          </div>
          <div className="metric-info">
            <h3>{stats.pendingReviews}</h3>
            <p>Pending Reviews</p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Activity Dashboard */}
      <div className="dashboard-activity-section">
        {/* Recent Enrollments */}
        <div className="activity-panel">
          <div className="panel-header-instructor">
            <h3>👨‍🎓 Recent Students</h3>
            <Link to="/instructor/students" className="view-all-link">
              View All <FiArrowRight />
            </Link>
          </div>
          <div className="activity-list-container">
            {stats.recentStudents.length === 0 ? (
              <div className="empty-panel-state">
                <FiUsers size={32} className="empty-state-icon" />
                <p>No student enrollments yet.</p>
              </div>
            ) : (
              <ul className="custom-activity-list">
                {stats.recentStudents.map((s) => (
                  <li key={s._id} className="custom-activity-item">
                    <div className="user-avatar-initial">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="activity-details">
                      <h4 className="activity-title-text">{s.name}</h4>
                      <p className="activity-subtitle-text">{s.email}</p>
                      <p className="activity-meta-text">Enrolled in <strong>{s.courseTitle}</strong></p>
                    </div>
                    <div className="activity-timestamp">
                      {new Date(s.enrolledAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="activity-panel">
          <div className="panel-header-instructor">
            <h3>📝 Recent Submissions</h3>
            <span className="submissions-badge gold-bg">Real-time</span>
          </div>
          <div className="activity-list-container">
            {stats.recentAssignments.length === 0 ? (
              <div className="empty-panel-state">
                <FiFileText size={32} className="empty-state-icon" />
                <p>No assignment submissions yet.</p>
              </div>
            ) : (
              <ul className="custom-activity-list">
                {stats.recentAssignments.map((sub) => (
                  <li key={sub._id} className="custom-activity-item">
                    <div className="user-avatar-initial assignment-avatar-color">
                      {sub.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="activity-details">
                      <h4 className="activity-title-text">{sub.studentName}</h4>
                      <p className="activity-meta-text">Submitted <strong>{sub.assignmentTitle}</strong></p>
                    </div>
                    <div className="activity-status-column">
                      <span className={`status-pill ${sub.status}`}>
                        {sub.status}
                      </span>
                      <span className="activity-timestamp-small">
                        {new Date(sub.submittedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="quick-actions-panel-section">
        <h3 className="section-header-title">Quick Actions</h3>
        <div className="quick-actions-grid-wrapper">
          <button className="action-button-card" onClick={() => navigate("/instructor/courses")}>
            <FiBookOpen size={20} className="action-card-icon" />
            <span>My Courses</span>
          </button>
          <button className="action-button-card" onClick={() => navigate("/instructor/students")}>
            <FiUsers size={20} className="action-card-icon" />
            <span>My Students</span>
          </button>
          <button className="action-button-card" onClick={() => navigate("/instructor/profile")}>
            <FiUser size={20} className="action-card-icon" />
            <span>My Profile</span>
          </button>
          <button className="action-button-card" onClick={() => navigate("/instructor/reports")}>
            <FiTrendingUp size={20} className="action-card-icon" />
            <span>View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;