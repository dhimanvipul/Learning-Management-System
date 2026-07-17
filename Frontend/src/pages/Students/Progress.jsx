import React, { useEffect, useState } from "react";
import {
  FiTrendingUp,
  FiAward,
  FiCheckCircle,
} from "react-icons/fi";
import StatCard from "../../components/Cards/StatCard";
import enrollmentService from "../../services/enrollmentService";
import "../Dashboard/Dashboard.css";

const Progress = () => {
  const [courses, setCourses] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [completedCourses, setCompletedCourses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user?._id) return;

        const data = await enrollmentService.getStudentEnrollments(user._id);

        setCourses(data);

        if (data.length > 0) {
          const totalProgress = data.reduce(
            (sum, course) => sum + (course.progress || 0),
            0
          );

          const averageProgress = Math.round(
            totalProgress / data.length
          );

          const completed = data.filter(
            (course) => course.progress === 100
          ).length;

          setOverallProgress(averageProgress);
          setCompletedCourses(completed);
        } else {
          setOverallProgress(0);
          setCompletedCourses(0);
        }
      } catch (err) {
        console.error("Progress fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Learning Progress</h1>
          <p>Track your course completion and achievements.</p>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <StatCard
          icon={FiTrendingUp}
          label="Overall Progress"
          value={`${overallProgress}%`}
          variant="gold"
        />

        <StatCard
          icon={FiCheckCircle}
          label="Completed Courses"
          value={completedCourses}
          variant="success"
        />

        <StatCard
          icon={FiAward}
          label="Certificates"
          value={completedCourses}
          variant="info"
        />

        <StatCard
          icon={FiTrendingUp}
          label="Current Streak"
          value="Coming Soon"
          variant="dark"
        />
      </div>

      {/* BODY */}
      <div className="dashboard-panel">
        <div className="panel-header">
          <h3>Course Progress</h3>
        </div>

        {loading ? (
          <p>Loading progress...</p>
        ) : !Array.isArray(courses) || courses.length === 0 ? (
          <p>No enrolled courses found.</p>
        ) : (
          (Array.isArray(courses) ? courses : []).map((course) => (
            <div key={course._id} style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>
                  {course.courseId?.title || "Untitled Course"}
                </span>

                <strong>{course.progress || 0}%</strong>
              </div>

              <progress
                value={course.progress || 0}
                max="100"
                style={{
                  width: "100%",
                  height: "12px",
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Progress;