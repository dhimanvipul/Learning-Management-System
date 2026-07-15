import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiClipboard } from "react-icons/fi";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import EmptyState from "../../components/Common/EmptyState";
import Button from "../../components/Common/Button";
import Modal from "../../components/Common/Modal";
import Badge from "../../components/Common/Badge";
import DataTable from "../../components/Table/DataTable";
import EnrollmentForm from "./EnrollmentForm";
import enrollmentService from "../../services/enrollmentService";
import studentService from "../../services/studentService";
import courseService from "../../services/courseService";
import "./Enrollments.css";
import { useMemo } from "react";
import SearchBar from "../../components/Common/SearchBar";

const statusVariant = (status) => {
  switch (status) {
    case "approved":
      return "success";

    case "pending":
      return "gold";

    case "rejected":
      return "danger";

    default:
      return "default";
  }
};

const Enrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [enrollmentData, studentData, courseData] = await Promise.all([
        enrollmentService.getAll(),
        studentService.getAll(),
        courseService.getAll(),
      ]);
      setEnrollments(enrollmentData);
      setStudents(studentData);
      setCourses(courseData);
    } catch (err) {
      setError(
        err.friendlyMessage || "Failed to load enrollments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddEnrollment = async (formData) => {
    setSubmitting(true);

    try {
      await enrollmentService.create(formData);

      await loadData();

      toast.success("Student enrolled successfully!");
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.friendlyMessage || "Failed to create enrollment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEnrollment = async (id) => {
    if (!window.confirm("Delete this enrollment?")) return;

    try {
      await enrollmentService.remove(id);

      setEnrollments((prev) =>
        prev.filter((item) => item._id !== id)
      );

      toast.success("Enrollment deleted successfully");
    } catch (err) {
      toast.error("Failed to delete enrollment");
    }
  };

  const filteredEnrollments = useMemo(() => {
    if (!search.trim()) return enrollments;

    const q = search.toLowerCase();

    return enrollments.filter((row) => {
      return (
        row.studentId?.name?.toLowerCase().includes(q) ||
        row.studentId?.email?.toLowerCase().includes(q) ||
        row.courseId?.title?.toLowerCase().includes(q) ||
        row.courseId?.code?.toLowerCase().includes(q)
      );
    });
  }, [enrollments, search]);

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (row) => (
        <div>
          <p className="table-primary-text">
            {row.studentId?.name || "Unknown Student"}
          </p>
          <p className="table-secondary-text">
            {row.studentId?.email || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "course",
      label: "Course",
      render: (row) => (
        <div>
          <p className="table-primary-text">
            {row.courseId?.title || "Unknown Course"}
          </p>
          <p className="table-secondary-text">{row.courseId?.code || "—"}</p>
        </div>
      ),
    },
    {
      key: "instructor",
      label: "Instructor",
      render: (row) => (
        <div>
          <p className="table-primary-text">
            {row.instructorId?.name || "Not Assigned"}
          </p>
          <p className="table-secondary-text">
            {row.instructorId?.email || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "Status",
      label: "Status",
      render: (row) => (
        <Badge variant={statusVariant(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Enrolled On",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString()
          : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() => handleDeleteEnrollment(row._id)}
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
      ),
    },
];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>
            Enrollments <span className="gold-accent">Records</span>
          </h1>
          <p>Link students to courses and track their grades.</p>
        </div>
        <Button
          icon={FiPlus}
          onClick={() => setIsModalOpen(true)}
          disabled={loading || students.length === 0 || courses.length === 0}
        >
          New Enrollment
        </Button>
      </div>

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search student or course..."
        />
      </div>

      {!loading && (students.length === 0 || courses.length === 0) && (
        <div className="enrollment-warning">
          You need at least one student and one course before creating an
          enrollment.
        </div>
      )}

      {loading ? (
        <Spinner label="Loading enrollments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : enrollments.length === 0 ? (
        <EmptyState
          title="No enrollments yet"
          message="Enroll a student in a course to get started."
          icon={FiClipboard}
          action={
            students.length > 0 &&
            courses.length > 0 && (
              <Button icon={FiPlus} onClick={() => setIsModalOpen(true)}>
                New Enrollment
              </Button>
            )
          }
        />
      ) : (
        <DataTable columns={columns} data={filteredEnrollments} />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Enrollment"
      >
        <EnrollmentForm
          students={students}
          courses={courses}
          onSubmit={handleAddEnrollment}
          submitting={submitting}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default Enrollments;
