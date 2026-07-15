import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiPlus, FiEye, FiUsers, FiMail } from "react-icons/fi";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import EmptyState from "../../components/Common/EmptyState";
import SearchBar from "../../components/Common/SearchBar";
import Button from "../../components/Common/Button";
import Modal from "../../components/Common/Modal";
import DataTable from "../../components/Table/DataTable";
import StudentForm from "./StudentForm";
import studentService from "../../services/studentService";
import "./Students.css";

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await studentService.getAll();
      setStudents(data);
    } catch (err) {
      setError(
        err.friendlyMessage || "Failed to load students. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const handleAddStudent = async (formData) => {
    setSubmitting(true);
    try {
      const newStudent = await studentService.create(formData);
      setStudents((prev) => [newStudent, ...prev]);
      toast.success("Student added successfully!");
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.friendlyMessage || "Failed to add student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Delete this student?")) return;

    try {
      await studentService.remove(id);

      setStudents((prev) =>
        prev.filter((student) => student._id !== id)
      );

      toast.success("Student deleted successfully");
    } catch (err) {
      console.log(err);
      toast.error("Failed to delete student");
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const columns = [
    {
      key: "name",
      label: "Student",
      render: (row) => (
        <div className="table-avatar-cell">
          <div className="table-avatar">
            {row.name?.charAt(0).toUpperCase() || "S"}
          </div>
          <div>
            <p className="table-primary-text">{row.name}</p>
            <p className="table-secondary-text">ID: {row._id?.slice(-6)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (row) => (
        <span>
          <FiMail size={13} style={{ marginRight: 6, opacity: 0.6 }} />
          {row.email}
        </span>
      ),
    },
    {
      key: "age",
      label: "Age",
      render: (row) => row.age ?? "N/A",
    },
    {
      key: "createdAt",
      label: "Joined",
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
              handleEditStudent(row)
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
              handleDeleteStudent(row._id)
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
            Students <span className="gold-accent">Management</span>
          </h1>
          <p>View, search, and manage all enrolled students.</p>
        </div>
        <Button icon={FiPlus} onClick={() => setIsModalOpen(true)}>
          Add Student
        </Button>
      </div>

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email..."
        />
        <div className="toolbar-count">
          <FiUsers size={15} />
          <span>{filteredStudents.length} student(s)</span>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading students..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadStudents} />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          title={search ? "No matching students" : "No students yet"}
          message={
            search
              ? "Try a different search term."
              : "Get started by adding your first student."
          }
          icon={FiUsers}
          action={
            !search && (
              <Button icon={FiPlus} onClick={() => setIsModalOpen(true)}>
                Add Student
              </Button>
            )
          }
        />
      ) : (
        <DataTable columns={columns} data={filteredStudents} />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        title={
          editingStudent
            ? "Edit Student"
            : "Add New Student"
        }
      >
        <StudentForm
          student={editingStudent}
          onSubmit={
            editingStudent
              ? async (formData) => {
                  try {
                    await studentService.update(
                      editingStudent._id,
                      formData
                    );

                    toast.success(
                      "Student updated successfully"
                    );

                    loadStudents();

                    setEditingStudent(null);
                    setIsModalOpen(false);
                  } catch (err) {
                    toast.error(
                      "Failed to update student"
                    );
                  }
                }
              : handleAddStudent
          }
          submitting={submitting}
          onCancel={() => {
            setEditingStudent(null);
            setIsModalOpen(false);
          }}
        />
      </Modal>
    </div>
  );
};

export default Students;
