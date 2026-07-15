import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiBookOpen, FiUser } from "react-icons/fi";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import EmptyState from "../../components/Common/EmptyState";
import SearchBar from "../../components/Common/SearchBar";
import Button from "../../components/Common/Button";
import Modal from "../../components/Common/Modal";
import Badge from "../../components/Common/Badge";
import DataTable from "../../components/Table/DataTable";
import InputField from "../../components/Common/InputField";
import CourseForm from "./CourseForm";
import courseService from "../../services/courseService";
import instructorService from "../../services/instructorService";
import "./Courses.css";

const CourseThumbnail = ({ course }) => {
  const [error, setError] = useState(false);

  const getThumbnailUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const baseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api/v1";
    const origin = baseUrl.replace(/\/api\/v1\/?$/, "");
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `${origin}/${cleanPath}`;
  };

  const thumbnailUrl = getThumbnailUrl(course.thumbnail);

  if (!course.thumbnail || error) {
    return (
      <div className="course-thumbnail-placeholder">
        No Image
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt={course.title}
      className="course-thumbnail"
      onError={() => setError(true)}
    />
  );
};

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [courseData, instructorData] = await Promise.all([
        courseService.getAll(),
        instructorService.getAll(),
      ]);
      setCourses(courseData);
      setInstructors(instructorData);
    } catch (err) {
      setError(
        err.friendlyMessage || "Failed to load courses. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const instructorMap = useMemo(() => {
    const map = {};
    instructors.forEach((i) => {
      map[i._id] = i;
    });
    return map;
  }, [instructors]);

  const getInstructorName = (course) => {
    if (course.instructorId && typeof course.instructorId === "object") {
      return course.instructorId.name || "Unknown";
    }
    const inst = instructorMap[course.instructorId];
    return inst ? inst.name : "Unassigned";
  };

  const filteredCourses = useMemo(() => {
    let result = courses;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q)
      );
    }

    if (instructorFilter) {
      result = result.filter((c) => {
        const instId =
          typeof c.instructorId === "object"
            ? c.instructorId?._id
            : c.instructorId;
        return instId === instructorFilter;
      });
    }

    return result;
  }, [courses, search, instructorFilter]);

  const handleSubmitCourse = async (formData) => {
    setSubmitting(true);

    try {
      if (editingCourse) {
        const thumbnailFile = formData.thumbnailFile;
        delete formData.thumbnailFile;

        await courseService.update(
          editingCourse._id,
          formData
        );

        if (thumbnailFile) {
          await courseService.uploadThumbnail(
            editingCourse._id,
            thumbnailFile
          );
        }

        toast.success(
          "Course updated successfully!"
        );
      } else {
        const thumbnailFile =
          formData.thumbnailFile;

        delete formData.thumbnailFile;

        const newCourse =
          await courseService.create(
            formData
          );

        if (thumbnailFile) {
          await courseService.uploadThumbnail(
            newCourse._id,
            thumbnailFile
          );
        }

        toast.success(
          "Course added successfully!"
        );
      }

      await loadData();

      setEditingCourse(null);
      setIsModalOpen(false);
    } catch (err) {
      console.log(err);

      toast.error(
        err.friendlyMessage ||
          "Failed to save course."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Delete this course?")) return;

    try {
      await courseService.remove(id);

      setCourses((prev) =>
        prev.filter((course) => course._id !== id)
      );

      toast.success("Course deleted successfully");
    } catch (err) {
      console.log(err);
      toast.error("Failed to delete course");
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };


  const columns = [
    {
      key: "thumbnail",
      label: "Thumbnail",
      render: (row) => <CourseThumbnail course={row} />,
    },
    {
      key: "title",
      label: "Course",
      render: (row) => (
        <div>
          <p className="table-primary-text">{row.title}</p>
          <p className="table-secondary-text">
            Code: {row.code || "N/A"}
          </p>
        </div>
      ),
    },
    {
      key: "credits",
      label: "Credits",
      render: (row) => (
        <Badge variant="gold">
          {row.credits ?? 3} cr
        </Badge>
      ),
    },
    {
      key: "level",
      label: "Level",
    },
    {
      key: "price",
      label: "Price",
      render: (row) => `₹${row.price || 0}`,
    },
    {
      key: "instructor",
      label: "Instructor",
      render: (row) => (
        <span className="instructor-cell">
          <FiUser size={13} style={{ opacity: 0.6 }} />
          {getInstructorName(row)}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString()
          : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            onClick={() =>
              handleEditCourse(row)
            }
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Edit
          </button>

          <button
            onClick={() =>
              handleDeleteCourse(row._id)
            }
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>
            Courses <span className="gold-accent">Catalog</span>
          </h1>
          <p>Manage all available courses and their instructors.</p>
        </div>
        <Button icon={FiPlus} onClick={() => setIsModalOpen(true)}>
          Add Course
        </Button>
      </div>

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by title or code..."
        />
        <div className="filter-box">
          <InputField
            as="select"
            name="instructorFilter"
            value={instructorFilter}
            onChange={(e) => setInstructorFilter(e.target.value)}
            placeholder="Filter by instructor"
            options={instructors.map((i) => ({ value: i._id, label: i.name }))}
          />
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading courses..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title={search || instructorFilter ? "No matching courses" : "No courses yet"}
          message={
            search || instructorFilter
              ? "Try adjusting your search or filter."
              : "Get started by adding your first course."
          }
          icon={FiBookOpen}
          action={
            !search &&
            !instructorFilter && (
              <Button icon={FiPlus} onClick={() => setIsModalOpen(true)}>
                Add Course
              </Button>
            )
          }
        />
      ) : (
        <DataTable columns={columns} data={filteredCourses} />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(null);
        }}
        title={
          editingCourse
            ? "Edit Course"
            : "Add New Course"
        }
      >
        <CourseForm
          instructors={instructors}
          initialData={editingCourse}
          onSubmit={handleSubmitCourse}
          submitting={submitting}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingCourse(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default Courses;
