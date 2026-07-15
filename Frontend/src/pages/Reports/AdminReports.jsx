import React, { useEffect, useState, useCallback } from "react";
import {
  FiBookOpen,
  FiUsers,
  FiDollarSign,
  FiUserCheck,
  FiPrinter,
  FiDownload,
} from "react-icons/fi";
import reportService from "../../services/reportService";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import "./AdminReports.css";

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState({
    kpis: {
      totalActiveCourses: 0,
      totalEnrolledStudents: 0,
      totalRevenue: 0,
      pendingInstructorApprovals: 0,
    },
    growth: [],
    levelDistribution: [],
    enrollmentStatusDistribution: [],
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await reportService.getAdminReports();
      if (data) {
        setReportData(data);
      }
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

  // Export growth data to CSV
  const handleExportCSV = () => {
    const growth = reportData.growth;
    if (growth.length === 0) return alert("No growth statistics available to export.");

    const headers = ["Month", "Students Signup", "Instructors Registered"];
    const csvRows = [headers.join(",")];

    growth.forEach((item) => {
      csvRows.push([item.month, item.students, item.instructors].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Admin_Growth_Report_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
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
  const maxGrowthVal = Math.max(
    ...reportData.growth.map((m) => Math.max(m.students, m.instructors)),
    1
  );

  return (
    <div className="reports-page-container">
      {/* Reports Header */}
      <div className="reports-page-header no-print">
        <div className="header-text-block">
          <h1>📊 Admin Analytics & Reports</h1>
          <p>Analyze student signups, revenue streams, course difficulty, and verification statuses.</p>
        </div>
        <div className="reports-action-group">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="reports-year-select"
          >
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
          </select>
          <button className="export-report-btn secondary" onClick={handlePrint} style={{ marginRight: 10 }}>
            <FiPrinter /> Print PDF
          </button>
          <button className="export-report-btn" onClick={handleExportCSV}>
            <FiDownload /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="reports-metrics-row">
        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Total Active Courses</span>
            <FiBookOpen className="card-top-icon gold-color" />
          </div>
          <h2>{reportData.kpis.totalActiveCourses}</h2>
          <p className="card-sub-info">Active catalog courses</p>
        </div>

        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Total Students</span>
            <FiUsers className="card-top-icon gold-color" />
          </div>
          <h2>{reportData.kpis.totalEnrolledStudents}</h2>
          <p className="card-sub-info">Signed up on platform</p>
        </div>

        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Total Revenue</span>
            <FiDollarSign className="card-top-icon gold-color" />
          </div>
          <h2>₹{reportData.kpis.totalRevenue}</h2>
          <p className="card-sub-info">Gross platform earnings</p>
        </div>

        <div className="report-metric-card">
          <div className="card-top-row">
            <span>Pending Approvals</span>
            <FiUserCheck className="card-top-icon gold-color" />
          </div>
          <h2>{reportData.kpis.pendingInstructorApprovals}</h2>
          <p className="card-sub-info">Instructors awaiting verify</p>
        </div>
      </div>

      {/* Main Charts Division */}
      <div className="reports-chart-activity-row">
        {/* Double CSS Bar Chart for growth */}
        <div className="enrollment-chart-card">
          <div className="panel-header-title">
            <h3>📈 Monthly Registrations ({selectedYear})</h3>
            <div className="legend-row">
              <span className="legend-item"><span className="legend-dot students-dot"></span> Students</span>
              <span className="legend-item"><span className="legend-dot instructors-dot"></span> Instructors</span>
            </div>
          </div>
          <div className="chart-wrapper-box">
            <div className="custom-bar-chart double-bar-chart">
              {reportData.growth.map((item) => {
                const studentHeight = (item.students / maxGrowthVal) * 100;
                const instructorHeight = (item.instructors / maxGrowthVal) * 100;
                return (
                  <div className="chart-bar-column double-bar-column" key={item.month}>
                    <div className="chart-bar-track double-track">
                      {/* Student bar */}
                      <div
                        className="chart-bar-fill student-fill"
                        style={{ height: `${studentHeight}%` }}
                      >
                        {item.students > 0 && (
                          <span className="bar-tooltip-label">{item.students}</span>
                        )}
                      </div>
                      {/* Instructor bar */}
                      <div
                        className="chart-bar-fill instructor-fill"
                        style={{ height: `${instructorHeight}%` }}
                      >
                        {item.instructors > 0 && (
                          <span className="bar-tooltip-label">{item.instructors}</span>
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

        {/* Distributions Side Cards */}
        <div className="distributions-card">
          {/* Course Level Distribution */}
          <div className="distribution-section">
            <div className="panel-header-title">
              <h3>📘 Course Level Distribution</h3>
            </div>
            <div className="distribution-progress-list">
              {reportData.levelDistribution.map((level) => {
                const total = reportData.levelDistribution.reduce((acc, curr) => acc + curr.value, 0) || 1;
                const percent = Math.round((level.value / total) * 100);
                return (
                  <div className="distribution-progress-item" key={level.name}>
                    <div className="dist-label-row">
                      <span>{level.name}</span>
                      <span>{level.value} ({percent}%)</span>
                    </div>
                    <div className="progress-bar-outer">
                      <div
                        className="progress-bar-inner gold-bg"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enrollment Status Distribution */}
          <div className="distribution-section" style={{ marginTop: 25 }}>
            <div className="panel-header-title">
              <h3>📋 Enrollment Status Proportions</h3>
            </div>
            <div className="distribution-progress-list">
              {reportData.enrollmentStatusDistribution.map((status) => {
                const total = reportData.enrollmentStatusDistribution.reduce((acc, curr) => acc + curr.value, 0) || 1;
                const percent = Math.round((status.value / total) * 100);
                return (
                  <div className="distribution-progress-item" key={status.name}>
                    <div className="dist-label-row">
                      <span>{status.name}</span>
                      <span>{status.value} ({percent}%)</span>
                    </div>
                    <div className="progress-bar-outer">
                      <div
                        className={`progress-bar-inner ${status.name === "Approved" ? "success-bg" : status.name === "Pending" ? "gold-bg" : "danger-bg"}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
