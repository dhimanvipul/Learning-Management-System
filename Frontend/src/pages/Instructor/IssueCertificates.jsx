import React, { useEffect, useState } from "react";
import { 
  FiAward, FiCheck, FiX, FiSearch, FiFilter, FiUser, 
  FiClipboard, FiPercent, FiBookOpen 
} from "react-icons/fi";
import enrollmentService from "../../services/enrollmentService";
import assignmentService from "../../services/assignmentService";
import Spinner from "../../components/Common/Spinner";
import { toast } from "react-toastify";
import "./IssueCertificates.css";

const IssueCertificates = () => {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const instructorId = user?.instructorId || user?._id;

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await enrollmentService.getInstructorStudents(instructorId);
      setEnrollments(data);
      
      // Extract unique courses for filtering
      const uniqueCoursesMap = {};
      data.forEach(e => {
        if (e.courseId) {
          uniqueCoursesMap[e.courseId._id] = e.courseId.title;
        }
      });
      const uniqueCourses = Object.keys(uniqueCoursesMap).map(id => ({
        _id: id,
        title: uniqueCoursesMap[id]
      }));
      setCourses(uniqueCourses);

      // Calculate stats
      const pendingCount = data.filter(e => e.certificateStatus === "pending").length;
      const approvedCount = data.filter(e => e.certificateStatus === "approved").length;
      const rejectedCount = data.filter(e => e.certificateStatus === "rejected").length;
      const totalComp = data.filter(e => e.progress === 100).length;

      setStats({
        totalCompleted: totalComp,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      });
    } catch (err) {
      console.error("Failed to fetch instructor students:", err);
      toast.error("Failed to load certificate candidates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const courseIdParam = queryParams.get("courseId");
    if (courseIdParam) {
      setCourseFilter(courseIdParam);
    }
    if (instructorId) {
      loadData();
    }
  }, [instructorId]);

  const handleApprove = async (id) => {
    try {
      await enrollmentService.issueCertificate(id, "approved");
      toast.success("Certificate approved and issued!");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to approve certificate.");
    }
  };

  const handleReject = async (id) => {
    try {
      await enrollmentService.issueCertificate(id, "rejected");
      toast.warning("Certificate request rejected.");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to reject certificate.");
    }
  };

  const handleOpenProgress = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setShowProgressModal(true);
  };

  const handleOpenAssignments = async (enrollment) => {
    setSelectedEnrollment(enrollment);
    setShowAssignmentsModal(true);
    setModalLoading(true);
    try {
      // Fetch all assignments for this course
      const courseAssignments = await assignmentService.getByCourse(enrollment.courseId._id);
      // Fetch student submissions
      const studentSubmissions = await assignmentService.getStudentSubmissions(enrollment.studentId._id);

      // Map submissions to assignments
      const mapped = courseAssignments.map(assignment => {
        const sub = studentSubmissions.find(s => s.assignmentId?._id === assignment._id || s.assignmentId === assignment._id);
        return {
          ...assignment,
          submission: sub || null
        };
      });

      setModalData(mapped);
    } catch (err) {
      toast.error("Failed to fetch assignment details.");
    } finally {
      setModalLoading(false);
    }
  };

  // Filter Logic
  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = e.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.studentId?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "all" || e.courseId?._id === courseFilter;
    
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "none") {
        matchesStatus = !e.certificateStatus || e.certificateStatus === "none";
      } else {
        matchesStatus = e.certificateStatus === statusFilter;
      }
    }

    return matchesSearch && matchesCourse && matchesStatus;
  });

  if (loading) return <div className="cert-loading-wrapper"><Spinner /></div>;

  return (
    <div className="issue-certificates-container">
      <div className="issue-header">
        <div>
          <h1>🏆 Issue Certificates</h1>
          <p>Review student course progress and assign completion certificates.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="issue-stats-grid">
        <div className="issue-stats-card gold-border">
          <div className="stats-icon-box gold">
            <FiBookOpen size={20} />
          </div>
          <div className="stats-info">
            <h3>{stats.totalCompleted}</h3>
            <p>100% Completed Students</p>
          </div>
        </div>

        <div className="issue-stats-card pending-border">
          <div className="stats-icon-box pending">
            <FiAward size={20} />
          </div>
          <div className="stats-info">
            <h3>{stats.pending}</h3>
            <p>Pending Cert Approval</p>
          </div>
        </div>

        <div className="issue-stats-card approved-border">
          <div className="stats-icon-box approved">
            <FiCheck size={20} />
          </div>
          <div className="stats-info">
            <h3>{stats.approved}</h3>
            <p>Certificates Issued</p>
          </div>
        </div>

        <div className="issue-stats-card rejected-border">
          <div className="stats-icon-box rejected">
            <FiX size={20} />
          </div>
          <div className="stats-info">
            <h3>{stats.rejected}</h3>
            <p>Requests Rejected</p>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="issue-toolbar">
        <div className="search-bar-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search student by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <div className="select-wrapper">
            <FiFilter className="filter-icon" />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <FiAward className="filter-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="none">No Request</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="candidates-table-container">
        {filteredEnrollments.length === 0 ? (
          <div className="no-candidates">
            <FiUser size={40} />
            <p>No student records match the filters.</p>
          </div>
        ) : (
          <table className="candidates-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Progress %</th>
                <th>Assignments</th>
                <th>Completion</th>
                <th>Cert Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollments.map((item) => {
                const isCompleted = item.progress === 100;
                const assignmentsCompleted = item.assignmentsCompleted;
                const canIssue = isCompleted && assignmentsCompleted;

                let badgeClass = "cert-badge-none";
                let badgeText = "No Request";

                if (item.certificateStatus === "pending") {
                  badgeClass = "cert-badge-pending";
                  badgeText = "Pending Approval";
                } else if (item.certificateStatus === "approved") {
                  badgeClass = "cert-badge-approved";
                  badgeText = "Approved";
                } else if (item.certificateStatus === "rejected") {
                  badgeClass = "cert-badge-rejected";
                  badgeText = "Rejected";
                }

                return (
                  <tr key={item._id}>
                    <td>
                      <div className="student-profile-cell">
                        <div className="student-avatar-small">
                          {item.studentId?.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <div className="student-name-text">{item.studentId?.name || "Student"}</div>
                          <div className="student-email-text">{item.studentId?.email || "-"}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="course-cell-text">{item.courseId?.title || "Course"}</div>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <span className="progress-number">{item.progress}%</span>
                        <div className="progress-bar-bg-small">
                          <div 
                            className="progress-bar-fill-small"
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`assignment-badge ${assignmentsCompleted ? "all-done" : "pending"}`}>
                        {item.assignmentStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`completion-status-pill ${isCompleted ? "complete" : "in-progress"}`}>
                        {isCompleted ? "Completed" : "In Progress"}
                      </span>
                    </td>
                    <td>
                      <span className={`cert-status-badge-table ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-row">
                        <button
                          className="table-action-btn secondary"
                          onClick={() => handleOpenProgress(item)}
                          title="View Student Progress"
                        >
                          <FiPercent size={14} />
                          <span>Progress</span>
                        </button>

                        <button
                          className="table-action-btn secondary"
                          onClick={() => handleOpenAssignments(item)}
                          title="View Assignments"
                        >
                          <FiClipboard size={14} />
                          <span>Assignments</span>
                        </button>

                        <button
                          className="table-action-btn approve"
                          disabled={!canIssue || item.certificateStatus === "approved"}
                          onClick={() => handleApprove(item._id)}
                          title={canIssue ? "Approve Certificate" : "Progress must be 100% & all assignments completed"}
                        >
                          <FiCheck size={14} />
                          <span>Approve</span>
                        </button>

                        <button
                          className="table-action-btn reject"
                          disabled={!canIssue || item.certificateStatus === "rejected"}
                          onClick={() => handleReject(item._id)}
                          title={canIssue ? "Reject Certificate" : "Progress must be 100% & all assignments completed"}
                        >
                          <FiX size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Progress View Modal */}
      {showProgressModal && selectedEnrollment && (
        <div className="cert-modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="cert-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Course Completion Details</h2>
              <button className="close-modal-btn" onClick={() => setShowProgressModal(false)}><FiX size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-student-card">
                <div className="modal-avatar">
                  {selectedEnrollment.studentId?.name?.charAt(0) || "S"}
                </div>
                <div>
                  <h3>{selectedEnrollment.studentId?.name}</h3>
                  <p>{selectedEnrollment.studentId?.email}</p>
                </div>
              </div>

              <div className="modal-details-grid">
                <div className="modal-detail-item">
                  <span className="label">Course Program:</span>
                  <span className="val">{selectedEnrollment.courseId?.title}</span>
                </div>
                <div className="modal-detail-item">
                  <span className="label">Curriculum Progress:</span>
                  <span className="val">{selectedEnrollment.progress}%</span>
                </div>
                <div className="modal-detail-item">
                  <span className="label">Assignment Status:</span>
                  <span className="val">{selectedEnrollment.assignmentStatus}</span>
                </div>
                <div className="modal-detail-item">
                  <span className="label">Certificate Status:</span>
                  <span className="val uppercase font-bold">{selectedEnrollment.certificateStatus || "none"}</span>
                </div>
              </div>

              <div className="progress-bar-large-container">
                <p>Overall Curriculum Mastery</p>
                <div className="progress-bar-bg-large">
                  <div 
                    className="progress-bar-fill-large"
                    style={{ width: `${selectedEnrollment.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="modal-requirements-list">
                <h4>Certification Prerequisites</h4>
                <div className={`prereq-item ${selectedEnrollment.progress === 100 ? "passed" : "failed"}`}>
                  <FiCheck className="prereq-icon" />
                  <span>Syllabus modules view progress at 100% ({selectedEnrollment.progress}%)</span>
                </div>
                <div className={`prereq-item ${selectedEnrollment.assignmentsCompleted ? "passed" : "failed"}`}>
                  <FiCheck className="prereq-icon" />
                  <span>All course assignments submitted ({selectedEnrollment.assignmentStatus})</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="gold-modal-btn" onClick={() => setShowProgressModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignments View Modal */}
      {showAssignmentsModal && selectedEnrollment && (
        <div className="cert-modal-overlay" onClick={() => setShowAssignmentsModal(false)}>
          <div className="cert-modal-box wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Submissions Matrix</h2>
              <button className="close-modal-btn" onClick={() => setShowAssignmentsModal(false)}><FiX size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-course-title">
                <h3>{selectedEnrollment.courseId?.title}</h3>
                <p>Student: <strong>{selectedEnrollment.studentId?.name}</strong></p>
              </div>

              {modalLoading ? (
                <div className="modal-loader"><Spinner /></div>
              ) : modalData.length === 0 ? (
                <div className="empty-modal-data">No assignments posted for this course yet.</div>
              ) : (
                <div className="submissions-table-container">
                  <table className="submissions-table">
                    <thead>
                      <tr>
                        <th>Assignment</th>
                        <th>Max Marks</th>
                        <th>Submission File</th>
                        <th>Status</th>
                        <th>Marks Awarded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map(item => (
                        <tr key={item._id}>
                          <td>
                            <div className="assign-title">{item.title}</div>
                            <div className="assign-date">Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "No Limit"}</div>
                          </td>
                          <td>{item.marks}</td>
                          <td>
                            {item.submission ? (
                              <a 
                                href={item.submission.fileUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="sub-file-link"
                              >
                                View File
                              </a>
                            ) : (
                              <span className="no-file-text">—</span>
                            )}
                          </td>
                          <td>
                            {item.submission ? (
                              <span className={`sub-status-pill ${item.submission.status}`}>
                                {item.submission.status === "evaluated" ? "Graded" : "Submitted"}
                              </span>
                            ) : (
                              <span className="sub-status-pill missing">Unsubmitted</span>
                            )}
                          </td>
                          <td>
                            {item.submission && item.submission.marks !== null ? (
                              <strong>{item.submission.marks} / {item.marks}</strong>
                            ) : (
                              <span className="no-marks">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="gold-modal-btn" onClick={() => setShowAssignmentsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueCertificates;
