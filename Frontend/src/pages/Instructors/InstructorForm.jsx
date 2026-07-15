import React, { useState } from "react";
import { FiUserPlus } from "react-icons/fi";
import InputField from "../../components/Common/InputField";
import Button from "../../components/Common/Button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InstructorForm = ({
  instructor,
  onSubmit,
  submitting,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: instructor?.name || "",
    subject: instructor?.subject || "",
    email: instructor?.email || "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    } else if (
      formData.name.trim().length < 2
    ) {
      newErrors.name =
        "Name must be at least 2 characters.";
    }

    if (!formData.subject.trim()) {
      newErrors.subject =
        "Subject is required.";
    }

    if (
      formData.email.trim() &&
      !EMAIL_REGEX.test(
        formData.email.trim()
      )
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    if (!instructor && !formData.password.trim()) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      subject: formData.subject.trim(),
    };

    if (formData.email.trim()) {
      payload.email =
        formData.email.trim();
    }

    if (!instructor && formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <InputField
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g. Dr. Sarah Johnson"
        error={errors.name}
        required
      />

      <InputField
        label="Subject"
        name="subject"
        value={formData.subject}
        onChange={handleChange}
        placeholder="e.g. Computer Science"
        error={errors.subject}
        required
      />

      <InputField
        label="Email Address"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="e.g. sarah.johnson@example.com"
        error={errors.email}
      />
      {!instructor && (
        <InputField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter login password"
          error={errors.password}
          required
        />
      )}

      <div className="form-actions">
        <Button
          variant="outline"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </Button>

        <Button
          type="submit"
          icon={FiUserPlus}
          loading={submitting}
          disabled={submitting}
        >
          {instructor
            ? "Update Instructor"
            : "Add Instructor"}
        </Button>
      </div>
    </form>
  );
};

export default InstructorForm;