import React, { useState } from "react";
import { FiUserPlus } from "react-icons/fi";
import InputField from "../../components/Common/InputField";
import Button from "../../components/Common/Button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const StudentForm = ({
  student,
  onSubmit,
  submitting,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: student?.name || "",
    email: student?.email || "",
    age: student?.age || "",
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
    } else if (formData.name.trim().length < 2) {
      newErrors.name =
        "Name must be at least 2 characters.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (
      !EMAIL_REGEX.test(formData.email.trim())
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    if (
      formData.age !== "" &&
      formData.age !== null
    ) {
      const ageNum = Number(formData.age);

      if (
        Number.isNaN(ageNum) ||
        ageNum < 0
      ) {
        newErrors.age =
          "Age must be a positive number.";
      } else if (ageNum > 120) {
        newErrors.age =
          "Please enter a realistic age.";
      }
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit({
      name: formData.name.trim(),
      email: formData.email.trim(),
      age:
        formData.age !== ""
          ? Number(formData.age)
          : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <InputField
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g. John Doe"
        error={errors.name}
        required
      />

      <InputField
        label="Email Address"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="e.g. john.doe@example.com"
        error={errors.email}
        required
      />

      <InputField
        label="Age"
        name="age"
        type="number"
        min="0"
        max="120"
        value={formData.age}
        onChange={handleChange}
        placeholder="e.g. 21"
        error={errors.age}
      />

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
          {student
            ? "Update Student"
            : "Add Student"}
        </Button>
      </div>
    </form>
  );
};

export default StudentForm;