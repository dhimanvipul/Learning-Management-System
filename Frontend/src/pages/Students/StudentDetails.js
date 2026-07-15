import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiMail, FiCalendar, FiHash } from "react-icons/fi";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import Button from "../../components/Common/Button";
import studentService from "../../services/studentService";
import "./StudentDetails.css";

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await studentService.getById(id);
      setStudent(data);
    } catch (err) {
      setError(
        err.friendlyMessage ||
          "Failed to load student details. The student may not exist."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  return (
    <div className="page-container">
      <button className="back-link" onClick={() => navigate("/students")}>
        <FiArrowLeft size={16} /> Back to Students
      </button>

      {loading ? (
        <Spinner label="Loading student details..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadStudent} />
      ) : student ? (
        <div className="student-details-card">
          <div className="student-details-header">
            <div className="student-details-avatar">
              {student.name?.charAt(0).toUpperCase() || "S"}
            </div>
            <div>
              <h1>{student.name}</h1>
              <p>Student Profile</p>
            </div>
          </div>

          <div className="student-details-grid">
            <div className="detail-item">
              <div className="detail-icon">
                <FiMail size={18} />
              </div>
              <div>
                <p className="detail-label">Email Address</p>
                <p className="detail-value">{student.email}</p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <FiCalendar size={18} />
              </div>
              <div>
                <p className="detail-label">Age</p>
                <p className="detail-value">{student.age ?? "N/A"}</p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <FiHash size={18} />
              </div>
              <div>
                <p className="detail-label">Student ID</p>
                <p className="detail-value">{student._id}</p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <FiCalendar size={18} />
              </div>
              <div>
                <p className="detail-label">Joined On</p>
                <p className="detail-value">
                  {student.createdAt
                    ? new Date(student.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={() => navigate("/students")}>
            Back to List
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default StudentDetails;
