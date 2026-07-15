import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import sectionService from "../../services/sectionService";
import lessonService from "../../services/lessonService";
import courseService from "../../services/courseService";
import assignmentService from "../../services/assignmentService";
import Modal from "../../components/Common/Modal";
import Button from "../../components/Common/Button";
import "./CourseContent.css";
import Spinner from "../../components/Common/Spinner";

import {
  FiBookOpen,
  FiEdit2,
  FiTrash2,
  FiChevronDown,
  FiSearch,
  FiFilter,
  FiPlay,
  FiFileText,
  FiDownload,
  FiEye,
  FiPlus,
  FiVideo,
  FiFolder,
  FiArrowLeft,
  FiPercent,
  FiClipboard,
  FiCalendar,
  FiCheck,
} from "react-icons/fi";

const CourseContent = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  // Tab State: 'syllabus' | 'assignments' | 'grading'
  const [activeTab, setActiveTab] = useState("syllabus");

  // Metadata State
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [lessons, setLessons] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Syllabus forms & expansions
  const [sectionTitle, setSectionTitle] = useState("");
  const [lessonForms, setLessonForms] = useState({});
  const [openSections, setOpenSections] = useState({});

  // Syllabus search/filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Assignment Modal & Form State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    marks: 100,
    dueDate: "",
    file: null,
  });
  const [assignmentUploadProgress, setAssignmentUploadProgress] = useState(0);

  // Grading Modal & Form State
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingForm, setGradingForm] = useState({
    marks: "",
    feedback: "",
  });

  // Media Preview State
  const [previewMedia, setPreviewMedia] = useState(null);

  // Upload progress state for lesson files
  const [uploadProgress, setUploadProgress] = useState({});

  // Fetch all course data based on current tab context
  const loadCourseData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Course details
      const courseDetails = await courseService.getById(courseId);
      setCourse(courseDetails);

      // 2. Fetch Syllabus sections and lessons
      const sectionData = await sectionService.getByCourse(courseId);
      setSections(sectionData);

      const lessonMap = {};
      const expandedState = {};
      for (const section of sectionData) {
        const lessonData = await lessonService.getBySection(section._id);
        lessonMap[section._id] = lessonData;
        expandedState[section._id] = true;
      }
      setLessons(lessonMap);
      setOpenSections(expandedState);

      // 3. Fetch Assignments for this course
      const courseAssignments = await assignmentService.getByCourse(courseId);
      setAssignments(courseAssignments);

      // 4. Fetch Submissions (aggregated from all assignments in this course)
      const allSubmissions = [];
      for (const assign of courseAssignments) {
        const subs = await assignmentService.getSubmissions(assign._id);
        subs.forEach((s) => {
          s.assignmentTitle = assign.title;
          s.assignmentMaxMarks = assign.marks;
        });
        allSubmissions.push(...subs);
      }
      setSubmissions(allSubmissions);
    } catch (err) {
      console.error("Error loading course details/syllabus/assignments:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Syllabus CRUD Handlers
  const addSection = async () => {
    try {
      if (!sectionTitle.trim()) return;
      await sectionService.create({
        title: sectionTitle,
        courseId,
      });
      setSectionTitle("");
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to create section");
    }
  };

  const deleteSection = async (sectionId) => {
    if (!window.confirm("Delete section and all its lessons?")) return;
    try {
      await sectionService.remove(sectionId);
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete section");
    }
  };

  const editSection = async (section) => {
    const title = prompt("New Section Title", section.title);
    if (!title || !title.trim()) return;
    try {
      await sectionService.update(section._id, { title });
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to update section");
    }
  };

  const addLesson = async (sectionId) => {
    try {
      const form = lessonForms[sectionId];
      if (!form?.title?.trim()) {
        return alert("Lesson title is required");
      }

      await lessonService.create({
        title: form.title,
        description: form.description || "",
        duration: Number(form.duration || 10),
        isFreePreview: form.isFreePreview || false,
        order: 1,
        sectionId,
      });

      setLessonForms((prev) => ({
        ...prev,
        [sectionId]: {
          title: "",
          description: "",
          duration: 10,
          isFreePreview: false,
        },
      }));

      setIsLessonModalOpen(false);
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to create lesson");
    }
  };

  const deleteLesson = async (lessonId) => {
    if (!window.confirm("Delete this lesson?")) return;
    try {
      await lessonService.remove(lessonId);
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete lesson");
    }
  };

  const editLesson = async (lesson) => {
    const title = prompt("Edit Lesson Title", lesson.title);
    if (!title || !title.trim()) return;
    try {
      await lessonService.update(lesson._id, { title });
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to update lesson");
    }
  };

  const handleVideoUpload = async (lessonId, file) => {
    if (!file) return;
    const progressKey = `${lessonId}-video`;
    try {
      setUploadProgress((prev) => ({ ...prev, [progressKey]: 1 }));
      await lessonService.uploadVideo(lessonId, file, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress((prev) => ({ ...prev, [progressKey]: percentCompleted }));
      });
      alert("Video Uploaded Successfully! ✅");
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Video upload failed");
    } finally {
      setTimeout(() => {
        setUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[progressKey];
          return updated;
        });
      }, 3000);
    }
  };

  const handlePdfUpload = async (lessonId, file) => {
    if (!file) return;
    const progressKey = `${lessonId}-pdf`;
    try {
      setUploadProgress((prev) => ({ ...prev, [progressKey]: 1 }));
      await lessonService.uploadPdf(lessonId, file, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress((prev) => ({ ...prev, [progressKey]: percentCompleted }));
      });
      alert("PDF Uploaded Successfully! ✅");
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("PDF upload failed");
    } finally {
      setTimeout(() => {
        setUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[progressKey];
          return updated;
        });
      }, 3000);
    }
  };

  const removeAttachment = async (lesson, fieldType) => {
    if (!window.confirm(`Remove this ${fieldType === "videoUrl" ? "video" : "PDF"}?`)) return;
    try {
      const payload = {};
      payload[fieldType] = "";
      await lessonService.update(lesson._id, payload);
      alert("Attachment removed.");
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to remove attachment");
    }
  };

  // Filter lessons inside sections
  const getFilteredLessons = (sectionId) => {
    const list = lessons[sectionId] || [];
    return list.filter((l) => {
      const matchesSearch =
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterType === "video") return !!l.videoUrl;
      if (filterType === "pdf") return !!l.pdfUrl;
      if (filterType === "free") return !!l.isFreePreview;
      return true;
    });
  };

  // Assignment Management Handlers
  const handleOpenCreateAssignment = () => {
    setSelectedAssignment(null);
    setAssignmentForm({
      title: "",
      description: "",
      marks: 100,
      dueDate: "",
      file: null,
    });
    setAssignmentUploadProgress(0);
    setIsAssignmentModalOpen(true);
  };

  const handleOpenEditAssignment = (assign) => {
    setSelectedAssignment(assign);
    setAssignmentForm({
      title: assign.title,
      description: assign.description,
      marks: assign.marks,
      dueDate: assign.dueDate ? assign.dueDate.split("T")[0] : "",
      file: null,
    });
    setAssignmentUploadProgress(0);
    setIsAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.title.trim()) return alert("Assignment title is required");

    const formData = new FormData();
    formData.append("title", assignmentForm.title);
    formData.append("description", assignmentForm.description);
    formData.append("marks", assignmentForm.marks);
    formData.append("dueDate", assignmentForm.dueDate);
    formData.append("courseId", courseId);
    if (assignmentForm.file) {
      formData.append("file", assignmentForm.file);
    }

    try {
      setAssignmentUploadProgress(10);
      if (selectedAssignment) {
        await assignmentService.update(selectedAssignment._id, formData);
        alert("Assignment Updated! ✅");
      } else {
        await assignmentService.create(formData);
        alert("Assignment Created! ✅");
      }
      setIsAssignmentModalOpen(false);
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to save assignment");
    } finally {
      setAssignmentUploadProgress(0);
    }
  };

  const handleDeleteAssignment = async (assignId) => {
    if (!window.confirm("Are you sure you want to delete this assignment and all submissions?")) return;
    try {
      await assignmentService.delete(assignId);
      alert("Assignment Deleted.");
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete assignment");
    }
  };

  // Grading Desk Handlers
  const handleOpenGrading = (sub) => {
    setSelectedSubmission(sub);
    setGradingForm({
      marks: sub.marks !== null ? sub.marks : "",
      feedback: sub.feedback || "",
    });
    setIsGradingModalOpen(true);
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    if (gradingForm.marks === "") return alert("Marks obtained is required");
    const numMarks = Number(gradingForm.marks);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > selectedSubmission.assignmentMaxMarks) {
      return alert(`Marks must be a number between 0 and ${selectedSubmission.assignmentMaxMarks}`);
    }

    try {
      await assignmentService.evaluateSubmission(selectedSubmission._id, {
        marks: numMarks,
        feedback: gradingForm.feedback,
      });
      alert("Grade submitted successfully! ✅");
      setIsGradingModalOpen(false);
      loadCourseData();
    } catch (err) {
      console.error(err);
      alert("Failed to submit evaluation");
    }
  };

  return (
    <div className="course-content-page">
      {/* Page Header */}
      <div className="content-page-header">
        <button className="back-courses-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <div className="title-section-block">
          <h2>{course ? course.title : "📚 Course"}</h2>
          <p>{course ? `${course.code || "LMS"} · ${course.level}` : "Loading Course details..."}</p>
        </div>
      </div>

      {/* Tab Switcher Panel */}
      <div className="course-tabs-nav">
        <button
          className={`tab-item-btn ${activeTab === "syllabus" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("syllabus")}
        >
          <FiBookOpen /> Syllabus Builder
        </button>
        <button
          className={`tab-item-btn ${activeTab === "assignments" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("assignments")}
        >
          <FiClipboard /> Assignments Manager
        </button>
        <button
          className={`tab-item-btn ${activeTab === "grading" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("grading")}
        >
          <FiCheck /> Grading Desk ({submissions.filter((s) => s.status === "pending").length} Pending)
        </button>
      </div>

      {/* SYLLABUS BUILDER TAB */}
      {activeTab === "syllabus" && (
        <>
          {/* Search & Filter */}
          <div className="content-controls-panel">
            <div className="search-box-wrapper">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-dropdown-wrapper">
              <FiFilter className="filter-icon" />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Media</option>
                <option value="video">Videos Only</option>
                <option value="pdf">PDFs Only</option>
                <option value="free">Free Previews</option>
              </select>
            </div>
          </div>

          {/* Create Section */}
          <div className="section-card gold-border-accent">
            <h3>Create New Section</h3>
            <div className="section-create-row">
              <input
                className="section-input"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Enter section title (e.g. Introduction to LMS)"
              />
              <button className="gold-add-btn" onClick={addSection}>
                <FiPlus /> Add Section
              </button>
            </div>
          </div>

          {/* Syllabus Roster */}
          {loading ? (
            <div className="content-loading-state">
              <Spinner label="Loading syllabus modules..." />
            </div>
          ) : sections.length === 0 ? (
            <div className="empty-content-state">
              <FiFolder size={48} className="empty-folder-icon" />
              <h3>No Sections Created Yet</h3>
              <p>Begin by creating your first course syllabus section above.</p>
            </div>
          ) : (
            <div className="sections-list-roster">
              {sections.map((section) => {
                const filteredList = getFilteredLessons(section._id);
                return (
                  <div key={section._id} className="content-section-card">
                    <div className="section-header-bar">
                      <div
                        className="section-title-click-region"
                        onClick={() =>
                          setOpenSections((prev) => ({
                            ...prev,
                            [section._id]: !prev[section._id],
                          }))
                        }
                      >
                        <FiChevronDown
                          className={`chevron-toggle-icon ${
                            openSections[section._id] ? "rotated-down" : ""
                          }`}
                        />
                        <h3 className="section-title-label">{section.title}</h3>
                        <span className="section-lessons-count-badge">
                          {filteredList.length} Lessons
                        </span>
                      </div>

                      <div className="section-actions-group">
                        <button className="section-icon-action-btn edit" onClick={() => editSection(section)}>
                          <FiEdit2 /> Edit
                        </button>
                        <button className="section-icon-action-btn delete" onClick={() => deleteSection(section._id)}>
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    </div>

                    {openSections[section._id] !== false && (
                      <div className="lessons-container-body">
                        {filteredList.length === 0 ? (
                          <p className="no-lessons-match-text">
                            No lessons match search/filters in this section.
                          </p>
                        ) : (
                          filteredList.map((lesson) => (
                            <div key={lesson._id} className="lesson-card-item">
                              <div className="lesson-card-header">
                                <div className="lesson-left-info">
                                  <h4>{lesson.title}</h4>
                                  <div className="lesson-badges-row">
                                    <span className="duration-badge">⏱ {lesson.duration} mins</span>
                                    {lesson.isFreePreview && (
                                      <span className="badge-pill preview">Free Preview</span>
                                    )}
                                    {lesson.videoUrl && (
                                      <span className="badge-pill video">🎥 Video</span>
                                    )}
                                    {lesson.pdfUrl && (
                                      <span className="badge-pill pdf">📄 PDF</span>
                                    )}
                                  </div>
                                </div>
                                <div className="lesson-right-actions">
                                  <button className="lesson-action-btn-small" onClick={() => editLesson(lesson)}>
                                    <FiEdit2 /> Edit
                                  </button>
                                  <button className="lesson-action-btn-small delete" onClick={() => deleteLesson(lesson._id)}>
                                    <FiTrash2 /> Delete
                                  </button>
                                </div>
                              </div>

                              <p className="lesson-description-text">{lesson.description}</p>

                              <div className="attachments-control-row">
                                {/* Video Upload */}
                                <div className="attachment-box-control">
                                  <span className="attachment-label-title">Video Attachment</span>
                                  {lesson.videoUrl ? (
                                    <div className="active-attachment-badge">
                                      <span className="filename-indicator">Lecture Video Loaded</span>
                                      <div className="attachment-button-actions">
                                        <button
                                          className="attachment-view-action"
                                          onClick={() =>
                                            setPreviewMedia({
                                              type: "video",
                                              url: lesson.videoUrl,
                                              title: lesson.title,
                                            })
                                          }
                                        >
                                          <FiEye /> Preview
                                        </button>
                                        <a
                                          href={lesson.videoUrl}
                                          download
                                          target="_blank"
                                          rel="noreferrer"
                                          className="attachment-download-action"
                                        >
                                          <FiDownload /> Download
                                        </a>
                                        <button
                                          className="attachment-remove-action"
                                          onClick={() => removeAttachment(lesson, "videoUrl")}
                                        >
                                          <FiTrash2 />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="file-upload-input-box">
                                      <label htmlFor={`video-${lesson._id}`} className="file-upload-trigger-btn">
                                        <FiVideo /> Select Video
                                      </label>
                                      <input
                                        id={`video-${lesson._id}`}
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => handleVideoUpload(lesson._id, e.target.files[0])}
                                      />
                                    </div>
                                  )}
                                  {uploadProgress[`${lesson._id}-video`] && (
                                    <div className="progress-meter-container">
                                      <div className="progress-meter-outer">
                                        <div
                                          className="progress-meter-inner"
                                          style={{ width: `${uploadProgress[`${lesson._id}-video`]}%` }}
                                        ></div>
                                      </div>
                                      <span className="progress-percentage-label">
                                        <FiPercent /> {uploadProgress[`${lesson._id}-video`]}%
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* PDF Upload */}
                                <div className="attachment-box-control">
                                  <span className="attachment-label-title">PDF Attachment</span>
                                  {lesson.pdfUrl ? (
                                    <div className="active-attachment-badge">
                                      <span className="filename-indicator">Study Notes Loaded</span>
                                      <div className="attachment-button-actions">
                                        <button
                                          className="attachment-view-action"
                                          onClick={() =>
                                            setPreviewMedia({
                                              type: "pdf",
                                              url: lesson.pdfUrl,
                                              title: lesson.title,
                                            })
                                          }
                                        >
                                          <FiEye /> Preview
                                        </button>
                                        <a
                                          href={lesson.pdfUrl}
                                          download
                                          target="_blank"
                                          rel="noreferrer"
                                          className="attachment-download-action"
                                        >
                                          <FiDownload /> Download
                                        </a>
                                        <button
                                          className="attachment-remove-action"
                                          onClick={() => removeAttachment(lesson, "pdfUrl")}
                                        >
                                          <FiTrash2 />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="file-upload-input-box">
                                      <label htmlFor={`pdf-${lesson._id}`} className="file-upload-trigger-btn">
                                        <FiFileText /> Select PDF
                                      </label>
                                      <input
                                        id={`pdf-${lesson._id}`}
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handlePdfUpload(lesson._id, e.target.files[0])}
                                      />
                                    </div>
                                  )}
                                  {uploadProgress[`${lesson._id}-pdf`] && (
                                    <div className="progress-meter-container">
                                      <div className="progress-meter-outer">
                                        <div
                                          className="progress-meter-inner"
                                          style={{ width: `${uploadProgress[`${lesson._id}-pdf`]}%` }}
                                        ></div>
                                      </div>
                                      <span className="progress-percentage-label">
                                        <FiPercent /> {uploadProgress[`${lesson._id}-pdf`]}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}

                        <div className="section-footer-area">
                          <button
                            className="add-lesson-trigger-btn"
                            onClick={() => {
                              setSelectedSection(section._id);
                              if (!lessonForms[section._id]) {
                                setLessonForms({
                                  ...lessonForms,
                                  [section._id]: {
                                    title: "",
                                    description: "",
                                    duration: 10,
                                    isFreePreview: false,
                                  },
                                });
                              }
                              setIsLessonModalOpen(true);
                            }}
                          >
                            <FiPlus /> Add Lesson
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ASSIGNMENTS MANAGER TAB */}
      {activeTab === "assignments" && (
        <div className="assignments-manager-tab-content">
          <div className="assignments-tab-header">
            <h3>Course Assignments</h3>
            <button className="gold-add-btn" onClick={handleOpenCreateAssignment}>
              <FiPlus /> Issue Assignment
            </button>
          </div>

          {loading ? (
            <div className="content-loading-state">
              <Spinner label="Loading assignments..." />
            </div>
          ) : assignments.length === 0 ? (
            <div className="empty-content-state">
              <FiClipboard size={48} className="empty-folder-icon" />
              <h3>No Assignments Issued Yet</h3>
              <p>Issue an assignment with instructions, due dates, and grading parameters.</p>
            </div>
          ) : (
            <div className="assignments-cards-grid">
              {assignments.map((assign) => (
                <div key={assign._id} className="assignment-manager-card">
                  <div className="card-top-info-wrap">
                    <h4>{assign.title}</h4>
                    <p className="assign-desc-paragraph">{assign.description || "No description provided."}</p>
                    <div className="assign-meta-badges">
                      <span className="assign-badge-detail">
                        <FiCalendar /> Due: {assign.dueDate ? new Date(assign.dueDate).toLocaleDateString() : "No Date"}
                      </span>
                      <span className="assign-badge-detail font-gold-bold">
                        Maximum Marks: {assign.marks}
                      </span>
                    </div>
                  </div>

                  <div className="card-attachment-bottom-actions">
                    {assign.fileUrl ? (
                      <div className="file-attachment-info-pill">
                        <FiFileText />
                        <span>Prompt File Loaded</span>
                        <a href={assign.fileUrl} download target="_blank" rel="noreferrer" className="attachment-dl-arrow">
                          <FiDownload />
                        </a>
                      </div>
                    ) : (
                      <span className="no-attachment-text-msg">No reference attachment.</span>
                    )}

                    <div className="assign-card-buttons">
                      <button className="lesson-action-btn-small" onClick={() => handleOpenEditAssignment(assign)}>
                        <FiEdit2 /> Edit
                      </button>
                      <button className="lesson-action-btn-small delete" onClick={() => handleDeleteAssignment(assign._id)}>
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GRADING DESK TAB */}
      {activeTab === "grading" && (
        <div className="grading-desk-tab-content">
          <div className="assignments-tab-header">
            <h3>Grading Desk</h3>
          </div>

          {loading ? (
            <div className="content-loading-state">
              <Spinner label="Loading student submissions..." />
            </div>
          ) : submissions.length === 0 ? (
            <div className="empty-content-state">
              <FiCheck size={48} className="empty-folder-icon" />
              <h3>No Submissions Found</h3>
              <p>When students submit solutions, their files and stats will display here for grading.</p>
            </div>
          ) : (
            <div className="table-wrapper-responsive">
              <table className="instructor-stats-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Assignment Name</th>
                    <th>Submission Date</th>
                    <th>Attached Solution</th>
                    <th>Review Status</th>
                    <th>Grading Score</th>
                    <th>Feedback</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub._id}>
                      <td>
                        <strong>{sub.studentId?.name || "Unknown Student"}</strong>
                        <div className="sub-detail-email">{sub.studentId?.email || "-"}</div>
                      </td>
                      <td>{sub.assignmentTitle}</td>
                      <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="submission-file-link-cell">
                          <span className="file-icon-tag"><FiFileText /> {sub.fileName || "Solution Document"}</span>
                          <div className="action-row-wrap-sub">
                            <button
                              className="view-btn-text"
                              onClick={() =>
                                setPreviewMedia({
                                  type: "pdf",
                                  url: sub.fileUrl,
                                  title: `Submission: ${sub.studentId?.name || "Student"}`,
                                })
                              }
                            >
                              <FiEye /> View
                            </button>
                            <a href={sub.fileUrl} download target="_blank" rel="noreferrer" className="dl-btn-text">
                              <FiDownload /> DL
                            </a>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${sub.status}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td>
                        <strong>{sub.marks !== null ? `${sub.marks} / ${sub.assignmentMaxMarks}` : `- / ${sub.assignmentMaxMarks}`}</strong>
                      </td>
                      <td className="feedback-col-text">{sub.feedback || <span className="none-text">No feedback</span>}</td>
                      <td>
                        <button className="grading-action-btn-accent" onClick={() => handleOpenGrading(sub)}>
                          {sub.status === "evaluated" ? "Re-Grade" : "Evaluate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Issuing/Editing Assignment Modal */}
      <Modal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        title={selectedAssignment ? "Edit Assignment Details" : "Issue New Assignment"}
      >
        <form onSubmit={handleSaveAssignment} className="lesson-modal-form">
          <label className="modal-form-field-label">Assignment Title</label>
          <input
            className="modal-input"
            placeholder="E.g. Homework 2: React State Hooks"
            value={assignmentForm.title}
            onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
            required
          />

          <label className="modal-form-field-label">Instructions / Description</label>
          <textarea
            className="modal-textarea"
            placeholder="Write assignment instructions or details..."
            value={assignmentForm.description}
            onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
          />

          <div className="modal-form-row">
            <div className="form-row-col">
              <label className="modal-form-field-label">Maximum Score</label>
              <input
                className="modal-input"
                type="number"
                value={assignmentForm.marks}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, marks: Number(e.target.value) })}
                required
              />
            </div>
            <div className="form-row-col">
              <label className="modal-form-field-label">Submission Due Date</label>
              <input
                className="modal-input"
                type="date"
                value={assignmentForm.dueDate}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
              />
            </div>
          </div>

          <label className="modal-form-field-label">Instructions Guideline Document (Optional PDF)</label>
          <input
            className="modal-input"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setAssignmentForm({ ...assignmentForm, file: e.target.files[0] })}
          />

          {assignmentUploadProgress > 0 && (
            <div className="assignment-upload-progress-meter">
              <p>Uploading to Cloudinary...</p>
              <div className="progress-bar-outer">
                <div className="progress-bar-inner gold-bg" style={{ width: `${assignmentUploadProgress}%` }}></div>
              </div>
            </div>
          )}

          <Button fullWidth type="submit">
            {selectedAssignment ? "Save Assignment" : "Issue Assignment"}
          </Button>
        </form>
      </Modal>

      {/* Grading Evaluation Modal */}
      <Modal
        isOpen={isGradingModalOpen}
        onClose={() => setIsGradingModalOpen(false)}
        title="Grade Assignment Submission"
      >
        {selectedSubmission && (
          <form onSubmit={handleSubmitGrade} className="lesson-modal-form">
            <div className="grading-student-meta-summary">
              <p><strong>Student:</strong> {selectedSubmission.studentId?.name}</p>
              <p><strong>Assignment:</strong> {selectedSubmission.assignmentTitle}</p>
              <p><strong>Maximum Allowable Marks:</strong> {selectedSubmission.assignmentMaxMarks}</p>
              <div className="modal-attachment-button-row">
                <a href={selectedSubmission.fileUrl} download target="_blank" rel="noreferrer" className="attachment-dl-btn-gold">
                  <FiDownload /> Download Submitted Solution File
                </a>
              </div>
            </div>

            <label className="modal-form-field-label">Marks Obtained</label>
            <input
              className="modal-input"
              type="number"
              min="0"
              max={selectedSubmission.assignmentMaxMarks}
              value={gradingForm.marks}
              onChange={(e) => setGradingForm({ ...gradingForm, marks: e.target.value })}
              placeholder={`Score out of ${selectedSubmission.assignmentMaxMarks}`}
              required
            />

            <label className="modal-form-field-label font-label-block">Instructor Remarks / Feedback</label>
            <textarea
              className="modal-textarea"
              placeholder="Leave feedback explaining the grade details..."
              value={gradingForm.feedback}
              onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
            />

            <Button fullWidth type="submit">
              Submit Grading Evaluation
            </Button>
          </form>
        )}
      </Modal>

      {/* Media Preview Modal Overlay */}
      {previewMedia && (
        <div className="media-preview-overlay-modal" onClick={() => setPreviewMedia(null)}>
          <div className="media-preview-box-card" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header-row">
              <h3>{previewMedia.title}</h3>
              <button className="preview-close-action" onClick={() => setPreviewMedia(null)}>
                &times;
              </button>
            </div>
            <div className="preview-body-content">
              {previewMedia.type === "video" ? (
                <video src={previewMedia.url} controls className="preview-html-video-player" autoPlay />
              ) : (
                <iframe
                  src={previewMedia.url}
                  title="PDF Document Preview"
                  className="preview-pdf-iframe"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseContent;