import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import sectionService from "../../services/sectionService";
import lessonService from "../../services/lessonService";
import assignmentService from "../../services/assignmentService";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import { toast } from "react-toastify";
import "./LessonView.css";

import {
  FiArrowLeft,
  FiBookOpen,
  FiVideo,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiUpload,
  FiCalendar,
  FiClipboard,
  FiAward,
  FiMessageCircle,
  FiEye,
  FiPercent,
  FiFolder,
} from "react-icons/fi";

const LessonView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Tab State: 'lessons' | 'assignments'
  const [activeTab, setActiveTab] = useState("lessons");

  // Core Data
  const [sections, setSections] = useState([]);
  const [lessonsMap, setLessonsMap] = useState({});
  const [currentLesson, setCurrentLesson] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({}); // { [assignmentId]: submissionObject }

  // UI status
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSections, setOpenSections] = useState({});

  // Submission uploads
  const [submitFile, setSubmitFile] = useState({}); // { [assignmentId]: File }
  const [uploadProgress, setUploadProgress] = useState({}); // { [assignmentId]: percent }

  // Preview overlay
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

  const fetchCourseContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?._id) {
        setError("User authentication session not found. Please log in.");
        return;
      }

      // 1. Fetch Sections
      const sectionData = await sectionService.getByCourse(courseId);
      setSections(sectionData);

      // 2. Fetch Lessons for each section
      const lMap = {};
      const expanded = {};
      let firstLesson = null;

      for (const sec of sectionData) {
        const list = await lessonService.getBySection(sec._id);
        lMap[sec._id] = list;
        expanded[sec._id] = true;
        if (!firstLesson && list.length > 0) {
          firstLesson = list[0];
        }
      }

      setLessonsMap(lMap);
      setOpenSections(expanded);
      setCurrentLesson(firstLesson);

      // 3. Fetch Assignments
      const assignmentList = await assignmentService.getByCourse(courseId);
      setAssignments(assignmentList);

      // 4. Fetch Student Submissions
      const subList = await assignmentService.getStudentSubmissions(user._id);
      const subMap = {};
      subList.forEach((s) => {
        subMap[s.assignmentId] = s;
      });
      setSubmissions(subMap);
    } catch (err) {
      console.error(err);
      setError("Failed to load course contents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseContent();
  }, [fetchCourseContent]);

  // Mark Lesson Complete & Update Enrollment Progress
  const markComplete = async () => {
    if (!currentLesson) return;
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?._id) return toast.error("User not logged in");

      const resEnroll = await fetch(
        `http://localhost:5000/api/enrollments/student/${user._id}`
      );
      const enrollmentsRes = await resEnroll.json();
      const enrollments = enrollmentsRes.data || [];

      const enrollment = enrollments.find(
        (e) => e.courseId?._id === courseId
      );

      if (!enrollment) {
        return toast.error("Active enrollment not found for this course.");
      }

      // Increment progress by 10%, clamp at 100%
      const newProgress = Math.min((enrollment.progress || 0) + 10, 100);

      const updateRes = await fetch(
        "http://localhost:5000/api/v1/lessons/progress/update",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enrollmentId: enrollment._id,
            progress: newProgress,
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error("Progress update failed");
      }

      toast.success(`Lesson Marked Complete! ✅ Progress: ${newProgress}%`);
      fetchCourseContent();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update course completion progress");
    }
  };

  // Submit Assignment Handler
  const handleSubmissionUpload = async (assignId) => {
    const file = submitFile[assignId];
    if (!file) return toast.warning("Please select a solution file to upload first");

    const user = JSON.parse(localStorage.getItem("user"));
    const formData = new FormData();
    formData.append("assignmentId", assignId);
    formData.append("studentId", user._id);
    formData.append("file", file);

    try {
      setUploadProgress((prev) => ({ ...prev, [assignId]: 15 }));
      await assignmentService.submitAssignment(formData);
      setUploadProgress((prev) => ({ ...prev, [assignId]: 100 }));
      toast.success("Assignment Submitted Successfully! 🚀");
      fetchCourseContent();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit assignment.");
    } finally {
      setTimeout(() => {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[assignId];
          return next;
        });
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="student-loading-layout">
        <Spinner label="Loading course player..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-error-layout">
        <ErrorState message={error} onRetry={fetchCourseContent} />
      </div>
    );
  }

  return (
    <div className="lesson-view-page">
      {/* Navigation Top Bar */}
      <div className="player-top-header">
        <button className="back-btn" onClick={() => navigate("/student/dashboard")}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="tab-menu-player">
          <button
            className={`player-tab-link ${activeTab === "lessons" ? "active" : ""}`}
            onClick={() => setActiveTab("lessons")}
          >
            <FiBookOpen /> Lectures Playlist
          </button>
          <button
            className={`player-tab-link ${activeTab === "assignments" ? "active" : ""}`}
            onClick={() => setActiveTab("assignments")}
          >
            <FiClipboard /> Assignments & Projects
          </button>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <div className="player-main-split">
        {activeTab === "lessons" ? (
          <>
            {/* LECTURES SPLIT: PLAYLIST & VIDEO PLAYER */}
            <div className="player-left-playlist">
              <h3>Course Syllabus</h3>
              {sections.length === 0 ? (
                <p className="no-sections-text">No syllabus content available.</p>
              ) : (
                sections.map((sec) => {
                  const list = lessonsMap[sec._id] || [];
                  const isSectionOpen = openSections[sec._id];
                  return (
                    <div key={sec._id} className="playlist-section-group">
                      <div
                        className="playlist-section-header"
                        onClick={() =>
                          setOpenSections((prev) => ({
                            ...prev,
                            [sec._id]: !prev[sec._id],
                          }))
                        }
                      >
                        <span>{sec.title}</span>
                        <span className="badge-count-playlist">{list.length}</span>
                      </div>

                      {isSectionOpen && (
                        <div className="playlist-lessons-list">
                          {list.map((less) => (
                            <div
                              key={less._id}
                              className={`playlist-lesson-row ${
                                currentLesson?._id === less._id ? "active-playing" : ""
                              }`}
                              onClick={() => setCurrentLesson(less)}
                            >
                              <div className="row-title-icon">
                                {less.videoUrl ? <FiVideo /> : <FiFileText />}
                                <span>{less.title}</span>
                              </div>
                              <span className="duration-tag">{less.duration}m</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="player-right-screen">
              {currentLesson ? (
                <div className="lesson-playback-card">
                  <h2>{currentLesson.title}</h2>
                  <div className="lesson-meta-bar">
                    <span className="badge-meta-player"><FiClock /> {currentLesson.duration} Mins</span>
                    {currentLesson.isFreePreview && (
                      <span className="badge-pill-player green">Free Preview</span>
                    )}
                  </div>

                  {currentLesson.videoUrl ? (
                    <div className="video-player-container-inner">
                      <video src={currentLesson.videoUrl} controls className="html5-video-player" key={currentLesson._id} />
                    </div>
                  ) : (
                    <div className="no-media-container">
                      <FiFileText size={48} />
                      <p>This is a text/documentation lecture. Read guidelines below.</p>
                    </div>
                  )}

                  <div className="lesson-details-markdown">
                    <h3>Lecture Summary</h3>
                    <p>{currentLesson.description || "No description provided for this lesson."}</p>
                  </div>

                  {currentLesson.pdfUrl && (
                    <div className="notes-attachment-panel">
                      <h4>Study Notes & Lecture Slides</h4>
                      <div className="pdf-doc-row">
                        <div className="pdf-info">
                          <FiFileText />
                          <span>Lecture Notes PDF</span>
                        </div>
                        <div className="pdf-actions">
                          <button className="preview-pdf-btn" onClick={() => setPreviewPdfUrl(currentLesson.pdfUrl)}>
                            <FiEye /> View
                          </button>
                          <a href={currentLesson.pdfUrl} download target="_blank" rel="noreferrer" className="dl-pdf-btn">
                            <FiDownload /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <button className="complete-action-main-btn" onClick={markComplete}>
                    <FiCheckCircle /> Mark Lecture as Completed
                  </button>
                </div>
              ) : (
                <div className="empty-player-placeholder">
                  <FiBookOpen size={64} className="fade-player-icon" />
                  <h3>Select a Lesson</h3>
                  <p>Choose a lesson from the syllabus playlist on the left to start learning.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ASSIGNMENTS SUBMISSION TAB */
          <div className="student-assignments-desk">
            <h2>Course Assignments</h2>
            <p className="subtitle-desc">Complete the following deliverables before the specified deadlines.</p>

            {assignments.length === 0 ? (
              <div className="empty-assignments-box">
                <FiClipboard size={48} />
                <h3>No Assignments Found</h3>
                <p>No deliverables are currently scheduled for this course.</p>
              </div>
            ) : (
              <div className="student-assignments-list">
                {assignments.map((assign) => {
                  const submission = submissions[assign._id];
                  const hasSub = !!submission;
                  const isGraded = hasSub && submission.status === "evaluated";

                  return (
                    <div key={assign._id} className="student-assign-card">
                      <div className="assign-header-block">
                        <div className="assign-title-wrap">
                          <h3>{assign.title}</h3>
                          <span className="due-date-text">
                            <FiCalendar /> Due: {assign.dueDate ? new Date(assign.dueDate).toLocaleDateString() : "No Deadline"}
                          </span>
                        </div>

                        {/* Status Pills */}
                        <div className="status-pill-wrap">
                          {!hasSub ? (
                            <span className="status-badge-student not-submitted">Not Submitted</span>
                          ) : submission.status === "pending" ? (
                            <span className="status-badge-student pending">Pending Review</span>
                          ) : (
                            <span className="status-badge-student graded">Graded</span>
                          )}
                        </div>
                      </div>

                      <p className="assign-desc-text">{assign.description}</p>

                      {/* Instructor Guideline Attachment */}
                      {assign.fileUrl && (
                        <div className="assign-guideline-box">
                          <FiFileText />
                          <span>Instruction Prompt Attachment</span>
                          <a href={assign.fileUrl} download target="_blank" rel="noreferrer" className="dl-gold-btn">
                            <FiDownload /> Download
                          </a>
                        </div>
                      )}

                      {/* Grade review if evaluated */}
                      {isGraded && (
                        <div className="grade-results-card">
                          <div className="grade-results-header">
                            <span className="grade-score-span">
                              <FiAward /> Score: <strong>{submission.marks} / {assign.marks}</strong>
                            </span>
                          </div>
                          {submission.feedback && (
                            <div className="grade-feedback-bubble">
                              <FiMessageCircle />
                              <div className="feedback-text">
                                <strong>Instructor Remarks:</strong>
                                <p>{submission.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Submission Upload Action Panel */}
                      {(!isGraded) && (
                        <div className="assign-upload-panel">
                          <h4>{hasSub ? "Resubmit Solution" : "Submit Solution"}</h4>
                          <div className="upload-flex-container">
                            <div className="file-input-wrapper-student">
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.zip"
                                onChange={(e) =>
                                  setSubmitFile((prev) => ({
                                    ...prev,
                                    [assign._id]: e.target.files[0],
                                  }))
                                }
                              />
                            </div>
                            <button
                              className="submit-solution-btn"
                              onClick={() => handleSubmissionUpload(assign._id)}
                            >
                              <FiUpload /> Upload Solution
                            </button>
                          </div>

                          {submitFile[assign._id] && (
                            <p className="selected-filename-tag">Selected: {submitFile[assign._id].name}</p>
                          )}

                          {uploadProgress[assign._id] && (
                            <div className="progress-meter-container">
                              <div className="progress-meter-outer">
                                <div
                                  className="progress-meter-inner"
                                  style={{ width: `${uploadProgress[assign._id]}%` }}
                                ></div>
                              </div>
                              <span className="progress-percentage-label">
                                <FiPercent /> {uploadProgress[assign._id]}% Uploading
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {hasSub && submission.status === "pending" && (
                        <div className="already-submitted-status">
                          <p>✓ You submitted <strong>{submission.fileName || "Solution document"}</strong> on {new Date(submission.updatedAt).toLocaleDateString()}.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF View Modal Overlay */}
      {previewPdfUrl && (
        <div className="pdf-preview-fullscreen-modal" onClick={() => setPreviewPdfUrl(null)}>
          <div className="pdf-preview-inner-box" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <h3>Study Notes Viewer</h3>
              <button className="close-pdf-btn" onClick={() => setPreviewPdfUrl(null)}>&times;</button>
            </div>
            <iframe src={previewPdfUrl} title="Student PDF Viewer" className="pdf-fullscreen-iframe" />
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonView;