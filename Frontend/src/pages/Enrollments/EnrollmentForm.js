import React, { useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import InputField from "../../components/Common/InputField";
import Button from "../../components/Common/Button";

const EnrollmentForm = ({
  students,
  courses,
  onSubmit,
  submitting,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    studentId: "",
    courseId: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.studentId) {
      newErrors.studentId = "Please select a student.";
    }

    if (!formData.courseId) {
      newErrors.courseId = "Please select a course.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      studentId: formData.studentId,
      courseId: formData.courseId,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <InputField
        label="Student"
        name="studentId"
        as="select"
        value={formData.studentId}
        onChange={handleChange}
        placeholder="Select a student"
        error={errors.studentId}
        required
        options={students.map((s) => ({
          value: s._id,
          label: `${s.name} (${s.email})`,
        }))}
      />
      <InputField
        label="Course"
        name="courseId"
        as="select"
        value={formData.courseId}
        onChange={handleChange}
        placeholder="Select a course"
        error={errors.courseId}
        required
        options={courses.map((c) => ({
          value: c._id,
          label: `${c.title} (${c.code || "N/A"})`,
        }))}
      />

      <div className="form-actions">
        <Button variant="outline" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          type="submit"
          icon={FiCheckCircle}
          loading={submitting}
          disabled={submitting}
        >
          Enroll Student
        </Button>
      </div>
    </form>
  );
};

export default EnrollmentForm;
