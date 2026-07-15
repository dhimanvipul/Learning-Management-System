import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiBookOpen,
  FiUserCheck,
  FiClipboard,
  FiActivity,
  FiArrowRight,
  FiPlusCircle,
} from "react-icons/fi";
import StatCard from "../../components/Cards/StatCard";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import EmptyState from "../../components/Common/EmptyState";
import Badge from "../../components/Common/Badge";
import studentService from "../../services/studentService";
import courseService from "../../services/courseService";
import instructorService from "../../services/instructorService";
import enrollmentService from "../../services/enrollmentService";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    instructors: 0,
    enrollments: 0,
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [recentEnrollments, setRecentEnrollments] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [students, courses, instructors, enrollments] = await Promise.all([
        studentService.getAll(),
        courseService.getAll(),
        instructorService.getAll(),
        enrollmentService.getAll(),
      ]);

      setStats({
        students: students.length,
        courses: courses.length,
        instructors: instructors.length,
        enrollments: enrollments.length,
      });

      setRecentStudents(
        [...students]
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          )
          .slice(0, 5)
      );

      setRecentEnrollments(
        [...enrollments]
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          )
          .slice(0, 5)
      );
    } catch (err) {
      setError(
        err.friendlyMessage ||
          "Failed to load dashboard data. Please make sure the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="page-container">
        <Spinner label="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <ErrorState message={error} onRetry={loadDashboard} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>
            Welcome back, <span className="gold-accent">Admin</span> 👋
          </h1>
          <p>Here's what's happening across your learning platform today.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={FiUsers}
          label="Total Students"
          value={stats.students}
          variant="gold"
        />
        <StatCard
          icon={FiBookOpen}
          label="Total Courses"
          value={stats.courses}
          variant="dark"
        />
        <StatCard
          icon={FiUserCheck}
          label="Total Instructors"
          value={stats.instructors}
          variant="info"
        />
        <StatCard
          icon={FiClipboard}
          label="Total Enrollments"
          value={stats.enrollments}
          variant="success"
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>
              <FiActivity size={17} /> Recent Students
            </h3>
            <button
              className="panel-link"
              onClick={() => navigate("/admin/students")}
            >
              View all <FiArrowRight size={14} />
            </button>
          </div>

          {recentStudents.length === 0 ? (
            <EmptyState
              title="No students yet"
              message="Add your first student to see activity here."
              icon={FiUsers}
            />
          ) : (
            <ul className="activity-list">
              {recentStudents.map((s) => (
                <li key={s._id} className="activity-item">
                  <div className="activity-avatar">
                    {s.name?.charAt(0).toUpperCase() || "S"}
                  </div>
                  <div className="activity-info">
                    <p className="activity-name">{s.name}</p>
                    <p className="activity-sub">{s.email}</p>
                  </div>
                  <Badge variant="gold">Age {s.age ?? "N/A"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>
              <FiClipboard size={17} /> Recent Enrollments
            </h3>
            <button
              className="panel-link"
              onClick={() => navigate("/admin/enrollments")}
            >
              View all <FiArrowRight size={14} />
            </button>
          </div>

          {recentEnrollments.length === 0 ? (
            <EmptyState
              title="No enrollments yet"
              message="Enroll a student in a course to see activity here."
              icon={FiClipboard}
            />
          ) : (
            <ul className="activity-list">
              {recentEnrollments.map((e) => (
                <li key={e._id} className="activity-item">
                  <div className="activity-avatar activity-avatar-dark">
                    {(e.studentId?.name || "S").charAt(0).toUpperCase()}
                  </div>
                  <div className="activity-info">
                    <p className="activity-name">
                      {e.studentId?.name || "Unknown Student"}
                    </p>
                    <p className="activity-sub">
                      Enrolled in {e.courseId?.title || "Unknown Course"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      e.status === "approved"
                        ? "success"
                        : e.status === "pending"
                        ? "gold"
                        : "danger"
                    }
                  >
                    {e.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="quick-actions">
        <h3 className="section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <button
            className="quick-action-card"
            onClick={() => navigate("/admin/students")}
          >
            <FiPlusCircle size={20} />
            <span>Add Student</span>
          </button>
          <button
            className="quick-action-card"
            onClick={() => navigate("/admin/courses")}
          >
            <FiPlusCircle size={20} />
            <span>Add Course</span>
          </button>
          <button
            className="quick-action-card"
            onClick={() => navigate("/admin/instructors")}
          >
            <FiPlusCircle size={20} />
            <span>Add Instructor</span>
          </button>
          <button
            className="quick-action-card"
            onClick={() => navigate("/admin/enrollments")}
          >
            <FiPlusCircle size={20} />
            <span>New Enrollment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
