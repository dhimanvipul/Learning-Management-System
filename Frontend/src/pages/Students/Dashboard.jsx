import React, { useEffect, useState } from "react";
import {
  FiBookOpen,
  FiAward,
  FiActivity,
  FiTrendingUp,
} from "react-icons/fi";
import StatCard from "../../components/Cards/StatCard";
import "../Dashboard/Dashboard.css";

const Dashboard = () => {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    enrolled: 0,
    inProgress: 0,
    completed: 0,
    overallProgress: 0,
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user?._id) return;

        const res = await fetch(
          `http://localhost:5000/api/enrollments/student/${user._id}`
        );

        const data = await res.json();

        const courseData = data.data || [];

        setCourses(courseData);;

        const enrolled = courseData.length;

        const completed = courseData.filter(
          (course) => course.progress === 100
        ).length;

        const inProgress = courseData.filter(
          (course) =>
            course.progress > 0 &&
            course.progress < 100
        ).length;

        const totalProgress = courseData.reduce(
          (sum, course) => sum + (course.progress || 0),
          0
        );

        const overallProgress =
          enrolled > 0
            ? Math.round(totalProgress / enrolled)
            : 0;

        setStats({
          enrolled,
          inProgress,
          completed,
          overallProgress,
        });
      } catch (err) {
        console.log(err);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>
            Welcome back, <span className="gold-accent">Student</span> 👋
          </h1>
          <p>Track your learning progress and enrolled courses.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={FiBookOpen}
          label="Enrolled Courses"
          value={stats.enrolled}
          variant="gold"
        />

        <StatCard
          icon={FiActivity}
          label="In Progress"
          value={stats.inProgress}
          variant="info"
        />

        <StatCard
          icon={FiAward}
          label="Completed"
          value={stats.completed}
          variant="success"
        />

        <StatCard
          icon={FiTrendingUp}
          label="Overall Progress"
          value={`${stats.overallProgress}%`}
          variant="dark"
        />
      </div>

      <div className="dashboard-grid">
        {/* My Courses */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>📚 My Courses</h3>
          </div>

          {!Array.isArray(courses) || courses.length === 0 ? (
            <p>No enrolled courses found.</p>
          ) : (
            <ul className="activity-list">
              {(Array.isArray(courses) ? courses : []).slice(0, 5).map((course) => (
                <li key={course._id} className="activity-item">
                  <div className="activity-avatar">
                    {course.courseId?.title?.charAt(0) || "C"}
                  </div>

                  <div className="activity-info">
                    <p className="activity-name">
                      {course.courseId?.title}
                    </p>

                    <p className="activity-sub">
                      Progress: {course.progress || 0}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Learning Progress */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>📈 Learning Progress</h3>
          </div>

          {!Array.isArray(courses) || courses.length === 0 ? (
            <p>No progress available.</p>
          ) : (
            <div style={{ marginTop: "20px" }}>
              {(Array.isArray(courses) ? courses : []).slice(0, 5).map((course) => (
                <div
                  key={course._id}
                  style={{ marginBottom: "20px" }}
                >
                  <p>{course.courseId?.title}</p>

                  <progress
                    value={course.progress || 0}
                    max="100"
                    style={{ width: "100%" }}
                  />

                  <p style={{ marginTop: "5px" }}>
                    {course.progress || 0}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;