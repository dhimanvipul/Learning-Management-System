import React, { useEffect, useState, useCallback } from "react";
import {
  FiBookOpen,
  FiUsers,
  FiClipboard,
  FiVideo,
  FiActivity,
  FiDownload,
  FiTrendingUp,
} from "react-icons/fi";
import instructorService from "../../services/instructorService";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import "./InstructorReports.css";

const InstructorReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState({
    totalCourses: 0,
    activeCourses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    assignmentCompletionRate: 0,
    monthlyEnrollments: [],
    courseStatistics: [],
    recentActivity: [],
  });

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user._id) {
        setError("User session not found. Please log in again.");
        return;
      }
      const data = await instructorService.getReports(user._id);
      setReportData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch reports. Please verify the backend is active.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Export Course Statistics to CSV
  const handleExportCSV = () => {
    const stats = reportData.courseStatistics;
    if (stats.length === 0) return alert("No course statistics available to export.");

    const headers = ["Course Code", "Course Title", "Level", "Students Enrolled", "Total Lessons", "Avg Progress (%)"];
    const csvRows = [headers.join(",")];

    stats.forEach((c) => {
      const row = [
        `"${c.code}"`,
        `"${c.title}"`,
        `"${c.level}"`,
        c.studentsCount,
        c.lessonsCount,
        `"${c.avgProgress}%"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Instructor_Course_Report_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="reports-loading-wrapper">
        <Spinner label="Generating platform reports..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <ErrorState message={error} onRetry={loadReports} />
      </div>
    );
  }

  // Calculate max monthly value to scale CSS bars
  const maxEnrollmentVal = Math.max(
    ...reportData.monthlyEnrollments.map((m) => m.enrollments),
    1
  );

  return (
    <div className="reports-page-container">
      {/* Reports Header */}
      <div className="reports-page-header">
        <div className="header-text-block">
          <h1>📊 Performance Reports</h1>
          <p>Analyze your class enrollments, syllabus status, and completion trends.</p>
        </div>
        <button className="export-report-btn" onClick={handleExportCSV}>
          <FiDownload /> Export CSV
        </button>
      </div>

      {/* Overview Cards */}
      <div className="reports-metrics-row">
        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Total Courses</span>
            <FiBookOpen className="card-top-icon gold-color" />
          </div>
          <h2>{reportData.totalCourses}</h2>
          <p className="card-sub-info">Created syllabus modules</p>
        </div>

        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Active Courses</span>
            <FiActivity className="card-top-icon gold-color" />
          </div>
          <h2>{reportData.activeCourses}</h2>
          <p className="card-sub-info">Courses with active enrollments</p>
        </div>

        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Total Students</span>
            <FiUsers className="card-top-icon gold-color" />
          </div>
          <h2>{reportData.totalStudents}</h2>
          <p className="card-sub-info">Across all assigned courses</p>
        </div>

        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Total Assignments</span>
            <FiClipboard className="card-top-icon gold-color" />
          </div>
          <h2>{reportData.totalAssignments}</h2>
          <p className="card-sub-info">Tasks set for students</p>
        </div>

        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Assignment Completion %</span>
            <FiTrendingUp className="card-top-icon gold-color" />
          </div>
          <h2>{reportData.assignmentCompletionRate}%</h2>
          <p className="card-sub-info">Syllabus completion progress</p>
        </div>
      </div>

      {/* Main Panel Division */}
      <div className="reports-chart-activity-row">
        {/* CSS Bar Chart */}
        <div className="enrollment-chart-card">
          <div className="panel-header-title">
            <h3>📈 Monthly Enrollments ({new Date().getFullYear()})</h3>
          </div>
          <div className="chart-wrapper-box">
            <div className="custom-bar-chart">
              {reportData.monthlyEnrollments.map((item) => {
                const heightPercent = (item.enrollments / maxEnrollmentVal) * 100;
                return (
                  <div className="chart-bar-column" key={item.month}>
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar-fill"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {item.enrollments > 0 && (
                          <span className="bar-tooltip-label">{item.enrollments}</span>
                        )}
                      </div>
                    </div>
                    <span className="chart-bar-month-text">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="recent-activity-card">
          <div className="panel-header-title">
            <h3>⚡ Recent Activity Feed</h3>
          </div>
          <div className="activity-feed-container">
            {reportData.recentActivity.length === 0 ? (
              <div className="empty-activity-log">
                <FiActivity size={28} className="empty-icon-color" />
                <p>No recent actions logged.</p>
              </div>
            ) : (
              <ul className="activity-feed-list">
                {reportData.recentActivity.map((act, index) => (
                  <li className="activity-feed-item" key={index}>
                    <span className="activity-bullet gold-bg"></span>
                    <div className="activity-content-wrap">
                      <p className="activity-log-msg">{act.message}</p>
                      <span className="activity-log-time">
                        {new Date(act.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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

      {/* Course Stats Table */}
      <div className="course-statistics-table-panel">
        <div className="panel-header-title">
          <h3>📘 Course Statistics</h3>
        </div>
        <div className="table-wrapper-responsive">
          <table className="instructor-stats-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Difficulty Level</th>
                <th>Students Enrolled</th>
                <th>Total Lessons</th>
                <th>Avg Completion Progress</th>
              </tr>
            </thead>
            <tbody>
              {reportData.courseStatistics.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-table-prompt">
                    No assigned courses or stats found.
                  </td>
                </tr>
              ) : (
                reportData.courseStatistics.map((course) => (
                  <tr key={course._id}>
                    <td><strong>{course.code}</strong></td>
                    <td>{course.title}</td>
                    <td>
                      <span className="badge-difficulty">{course.level}</span>
                    </td>
                    <td>{course.studentsCount} Students</td>
                    <td>{course.lessonsCount} Lessons</td>
                    <td>
                      <div className="progress-cell-wrapper">
                        <div className="progress-bar-outer">
                          <div
                            className="progress-bar-inner gold-bg"
                            style={{ width: `${course.avgProgress}%` }}
                          ></div>
                        </div>
                        <span className="progress-value-label">{course.avgProgress}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InstructorReports;
