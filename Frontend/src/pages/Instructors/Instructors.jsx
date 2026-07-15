import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiUserCheck, FiMail, FiBookOpen, FiClock, FiCheck, FiX } from "react-icons/fi";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import EmptyState from "../../components/Common/EmptyState";
import SearchBar from "../../components/Common/SearchBar";
import Button from "../../components/Common/Button";
import Modal from "../../components/Common/Modal";
import Badge from "../../components/Common/Badge";
import DataTable from "../../components/Table/DataTable";
import InstructorForm from "./InstructorForm";
import instructorService from "../../services/instructorService";
import "./Instructors.css";

const Instructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);

  // Tab State: 'active' | 'pending'
  const [activeTab, setActiveTab] = useState("active");

  const loadInstructors = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await instructorService.getAll();
      setInstructors(data);
    } catch (err) {
      setError(
        err.friendlyMessage || "Failed to load instructors. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstructors();
  }, [loadInstructors]);

  // Handle instructor status change (Approve/Reject)
  const handleStatusChange = async (id, status) => {
    const actionText = status === "approved" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${actionText} this instructor registration?`)) {
      return;
    }

    try {
      await instructorService.updateStatus(id, status);
      toast.success(`Instructor registration ${status === "approved" ? "approved" : "rejected"} successfully!`);
      loadInstructors();
    } catch (err) {
      toast.error(err.friendlyMessage || "Failed to update registration status.");
    }
  };

  const filteredInstructors = useMemo(() => {
    // 1. Filter by role status
    const targetStatus = activeTab === "active" ? "approved" : "pending";
    const statusFiltered = instructors.filter((inst) => {
      if (activeTab === "active") {
        return inst.status === "approved" || !inst.status;
      } else {
        return inst.status === "pending" || inst.status === "rejected";
      }
    });

    // 2. Filter by search query
    if (!search.trim()) return statusFiltered;
    const q = search.toLowerCase();
    return statusFiltered.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.subject?.toLowerCase().includes(q) ||
        i.email?.toLowerCase().includes(q)
    );
  }, [instructors, search, activeTab]);

  const handleAddInstructor = async (formData) => {
    setSubmitting(true);
    try {
      const newInstructor = await instructorService.create(formData);
      setInstructors((prev) => [newInstructor, ...prev]);
      toast.success("Instructor added successfully!");
      setIsModalOpen(false);
      loadInstructors();
    } catch (err) {
      toast.error(err.friendlyMessage || "Failed to add instructor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInstructor = async (id) => {
    if (!window.confirm("Delete this instructor profile?")) return;

    try {
      await instructorService.remove(id);
      setInstructors((prev) =>
        prev.filter((instructor) => instructor._id !== id)
      );
      toast.success("Instructor deleted successfully");
    } catch (err) {
      console.log(err);
      toast.error("Failed to delete instructor");
    }
  };

  const handleEditInstructor = (instructor) => {
    setEditingInstructor(instructor);
    setIsModalOpen(true);
  };

  const columns = [
    {
      key: "name",
      label: "Instructor",
      render: (row) => (
        <div className="table-avatar-cell">
          <div className="table-avatar">
            {row.name?.charAt(0).toUpperCase() || "I"}
          </div>
          <div>
            <p className="table-primary-text">{row.name}</p>
            <p className="table-secondary-text">ID: {row._id?.slice(-6)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <Badge variant="gold">
          <FiBookOpen size={12} style={{ marginRight: 5 }} />
          {row.subject}
        </Badge>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (row) => (
        <span>
          <FiMail size={13} style={{ marginRight: 6, opacity: 0.6 }} />
          {row.email || "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const stat = row.status || "approved";
        if (stat === "approved") {
          return <Badge variant="success">Active</Badge>;
        } else if (stat === "pending") {
          return (
            <Badge variant="warning">
              <FiClock size={12} style={{ marginRight: 4 }} /> Pending Approval
            </Badge>
          );
        } else {
          return <Badge variant="danger">Rejected</Badge>;
        }
      },
    },
    {
      key: "createdAt",
      label: "Joined Date",
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => {
        const isPending = row.status === "pending" || row.status === "rejected";
        return (
          <div style={{ display: "flex", gap: "8px" }}>
            {isPending ? (
              <>
                <button
                  onClick={() => handleStatusChange(row._id, "approved")}
                  style={{
                    background: "#22c55e",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12.5px",
                    fontWeight: "600",
                  }}
                >
                  <FiCheck /> Approve
                </button>
                {row.status !== "rejected" && (
                  <button
                    onClick={() => handleStatusChange(row._id, "rejected")}
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12.5px",
                      fontWeight: "600",
                    }}
                  >
                    <FiX /> Reject
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => handleEditInstructor(row)}
                  style={{
                    background: "#c59b27",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12.5px",
                    fontWeight: "600",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteInstructor(row._id)}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12.5px",
                    fontWeight: "600",
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>
            Instructors <span className="gold-accent">Directory</span>
          </h1>
          <p>Manage instructor applications, subject tracks, and profiles.</p>
        </div>
        <Button icon={FiPlus} onClick={() => setIsModalOpen(true)}>
          Add Instructor
        </Button>
      </div>

      {/* Tabs Control Row */}
      <div className="instructor-tabs-bar">
        <button
          className={`inst-tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Active Directory
        </button>
        <button
          className={`inst-tab-btn ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Registration Queue
          {instructors.filter(i => i.status === "pending").length > 0 && (
            <span className="pending-indicator-dot">
              {instructors.filter(i => i.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, subject, or email..."
        />
        <div className="toolbar-count">
          <FiUserCheck size={15} />
          <span>{filteredInstructors.length} instructor(s)</span>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading instructors..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadInstructors} />
      ) : filteredInstructors.length === 0 ? (
        <EmptyState
          title={search ? "No matching instructors" : "Queue is empty"}
          message={
            search
              ? "Try a different search term."
              : activeTab === "active"
              ? "Get started by adding your first instructor."
              : "No pending applications need approval."
          }
          icon={FiUserCheck}
          action={
            !search && activeTab === "active" && (
              <Button icon={FiPlus} onClick={() => setIsModalOpen(true)}>
                Add Instructor
              </Button>
            )
          }
        />
      ) : (
        <DataTable columns={columns} data={filteredInstructors} />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Instructor"
      >
        <InstructorForm
          instructor={editingInstructor}
          onSubmit={
            editingInstructor
              ? async (formData) => {
                  try {
                    await instructorService.update(
                      editingInstructor._id,
                      formData
                    );
                    toast.success("Instructor updated successfully");
                    loadInstructors();
                    setEditingInstructor(null);
                    setIsModalOpen(false);
                  } catch (err) {
                    toast.error("Failed to update instructor");
                  }
                }
              : handleAddInstructor
          }
          submitting={submitting}
          onCancel={() => {
            setEditingInstructor(null);
            setIsModalOpen(false);
          }}
        />
      </Modal>
    </div>
  );
};

export default Instructors;
