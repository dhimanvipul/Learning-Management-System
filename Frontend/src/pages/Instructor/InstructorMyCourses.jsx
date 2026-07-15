import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBookOpen, FiDollarSign, FiClock, FiBarChart2, FiUsers, 
  FiClipboard, FiCalendar, FiPlus, FiEdit2, FiTrash2, FiAward, FiX
} from "react-icons/fi";
import courseService from "../../services/courseService";
import Spinner from "../../components/Common/Spinner";
import { toast } from "react-toastify";
import "./InstructorMyCourses.css";

const InstructorMyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    credits: 3,
    level: "Beginner",
    price: 0,
    duration: 0,
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const instructorId = user?.instructorId || user?._id;

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getInstructorCourses(instructorId);
      setCourses(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormData({
      title: "",
      description: "",
      code: "",
      credits: 3,
      level: "Beginner",
      price: 0,
      duration: 0,
    });
    setThumbnailFile(null);
    setShowModal(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title || "",
      description: course.description || "",
      code: course.code || "",
      credits: course.credits || 3,
      level: course.level || "Beginner",
      price: course.price || 0,
      duration: course.duration || 0,
    });
    setThumbnailFile(null);
    setShowModal(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      try {
        await courseService.remove(courseId);
        toast.success("Course deleted successfully!");
        loadCourses();
      } catch (err) {
        toast.error("Failed to delete course.");
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" || name === "credits" ? Number(value) : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCourse) {
        // Update Course Meta
        const payload = { ...formData, instructorId };
        const updatedCourse = await courseService.update(editingCourse._id, payload);

        // Upload Thumbnail if changed
        if (thumbnailFile && updatedCourse?._id) {
          await courseService.uploadThumbnail(updatedCourse._id, thumbnailFile);
        }

        toast.success("Course updated successfully!");
      } else {
        // Create Course
        const payload = { ...formData, instructorId, thumbnailFile };
        await courseService.create(payload);
        toast.success("Course created successfully!");
      }
      setShowModal(false);
      loadCourses();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save course.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const totalCourses = courses.length;
  const totalStudents = courses.reduce((acc, curr) => acc + (curr.studentsEnrolled || 0), 0);
  const totalHours = courses.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const avgOverallProgress = courses.length > 0
    ? Math.round(courses.reduce((acc, curr) => acc + (curr.averageProgress || 0), 0) / courses.length)
    : 0;

  if (loading) return <div className="courses-loading-wrapper"><Spinner /></div>;

  return (
    <div className="instructor-courses-container">
      <div className="courses-page-header">
        <div>
          <h1>📚 My Courses</h1>
          <p>Create, update, and manage the lessons and evaluations for your courses.</p>
        </div>
        <button className="add-course-btn" onClick={handleOpenCreate}>
          <FiPlus size={16} />
          <span>Add Course</span>
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="courses-stats-grid">
        <div className="courses-stat-card">
          <div className="stat-icon-wrapper blue">
            <FiBookOpen size={20} />
          </div>
          <div className="stat-info">
            <h3>{totalCourses}</h3>
            <p>Total Courses</p>
          </div>
        </div>

        <div className="courses-stat-card">
          <div className="stat-icon-wrapper green">
            <FiUsers size={20} />
          </div>
          <div className="stat-info">
            <h3>{totalStudents}</h3>
            <p>Total Enrollments</p>
          </div>
        </div>

        <div className="courses-stat-card">
          <div className="stat-icon-wrapper gold">
            <FiClock size={20} />
          </div>
          <div className="stat-info">
            <h3>{totalHours} hrs</h3>
            <p>Instruction Hours</p>
          </div>
        </div>

        <div className="courses-stat-card">
          <div className="stat-icon-wrapper purple">
            <FiBarChart2 size={20} />
          </div>
          <div className="stat-info">
            <h3>{avgOverallProgress}%</h3>
            <p>Average Progress</p>
          </div>
        </div>
      </div>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="empty-courses-state">
          <FiBookOpen size={48} className="empty-icon" />
          <h3>No Courses Found</h3>
          <p>You haven't created any courses yet. Click "Add Course" above to get started.</p>
        </div>
      ) : (
        <div className="instructor-course-grid">
          {courses.map((course) => {
            const hasThumbnail = !!course.thumbnail;

            return (
              <div className="instructor-course-card" key={course._id}>
                {/* Course Thumbnail Area */}
                <div className="course-card-thumbnail">
                  {hasThumbnail ? (
                    <img src={course.thumbnail} alt={course.title} />
                  ) : (
                    <div className="course-thumbnail-placeholder">
                      <FiBookOpen size={40} />
                    </div>
                  )}
                  <div className="course-card-level-badge">
                    {course.level}
                  </div>
                </div>

                {/* Course Details */}
                <div className="course-card-content">
                  <div className="course-header-row">
                    <span className="course-active-status-badge">
                      <span className="pulse-dot"></span>
                      Active
                    </span>
                    <span className="course-date-stamp">
                      <FiCalendar size={12} />
                      {course.createdAt ? new Date(course.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short"
                      }) : "Recent"}
                    </span>
                  </div>

                  <h3>{course.title}</h3>
                  <p className="course-desc-snip">{course.description || "No description provided."}</p>

                  <div className="course-details-row">
                    <div className="course-metric-col" title="Enrolled Students">
                      <FiUsers size={14} />
                      <span>{course.studentsEnrolled || 0} enrolled</span>
                    </div>
                    <div className="course-metric-col" title="Assignments">
                      <FiClipboard size={14} />
                      <span>{course.assignmentsCount || 0} tasks</span>
                    </div>
                    <div className="course-metric-col" title="Price">
                      <FiDollarSign size={14} />
                      <span>₹{course.price}</span>
                    </div>
                  </div>

                  {/* Course Progress Section */}
                  <div className="course-progress-panel">
                    <div className="progress-labels">
                      <span>Avg Student Progress</span>
                      <strong>{course.averageProgress || 0}%</strong>
                    </div>
                    <div className="course-progress-bar-bg">
                      <div 
                        className="course-progress-bar-fill" 
                        style={{ width: `${course.averageProgress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Primary Controls */}
                  <div className="course-card-actions">
                    <button
                      className="btn-primary-action"
                      onClick={() => navigate(`/instructor/course/${course._id}`)}
                      title="Manage Content & Lessons"
                    >
                      <FiBookOpen size={14} />
                      <span>Manage Content</span>
                    </button>

                    <div className="btn-icon-actions-group">
                      <button
                        className="btn-icon-action"
                        onClick={() => navigate(`/instructor/students?courseId=${course._id}`)}
                        title="View Course Students"
                      >
                        <FiUsers size={14} />
                      </button>

                      <button
                        className="btn-icon-action"
                        onClick={() => navigate(`/instructor/certificates?courseId=${course._id}`)}
                        title="Issue Certificates"
                      >
                        <FiAward size={14} />
                      </button>

                      <button
                        className="btn-icon-action edit"
                        onClick={() => handleOpenEdit(course)}
                        title="Edit Course Details"
                      >
                        <FiEdit2 size={14} />
                      </button>

                      <button
                        className="btn-icon-action delete"
                        onClick={() => handleDelete(course._id)}
                        title="Delete Course"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Course Modal Dialog */}
      {showModal && (
        <div className="modal-form-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-form-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-form-header">
              <h2>{editingCourse ? "✏️ Edit Course Details" : "✨ Create New Course"}</h2>
              <button className="close-form-btn" onClick={() => setShowModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-form-body">
                <div className="form-group-grid">
                  <div className="form-input-control full-width">
                    <label>Course Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Advanced Machine Learning"
                    />
                  </div>

                  <div className="form-input-control">
                    <label>Course Code</label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="e.g. CS-402"
                    />
                  </div>

                  <div className="form-input-control">
                    <label>Credits</label>
                    <input
                      type="number"
                      name="credits"
                      value={formData.credits}
                      onChange={handleInputChange}
                      min={1}
                      max={10}
                    />
                  </div>

                  <div className="form-input-control">
                    <label>Difficulty Level</label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="form-input-control">
                    <label>Price (INR)</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min={0}
                    />
                  </div>

                  <div className="form-input-control">
                    <label>Duration (Hours)</label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      min={0}
                    />
                  </div>

                  <div className="form-input-control">
                    <label>Course Thumbnail</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="form-input-control full-width">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Provide a detailed overview of the curriculum goals and contents..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-form-footer">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : editingCourse ? "Save Changes" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorMyCourses;