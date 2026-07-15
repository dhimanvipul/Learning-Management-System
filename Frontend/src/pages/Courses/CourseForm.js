import React, { useState } from "react";
import { FiPlusCircle } from "react-icons/fi";
import InputField from "../../components/Common/InputField";
import Button from "../../components/Common/Button";

const CourseForm = ({
  instructors,
  onSubmit,
  submitting,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    code: initialData?.code || "",
    credits: initialData?.credits || "3",
    instructorId:
      initialData?.instructorId?._id ||
      initialData?.instructorId ||
      "",
    description: initialData?.description || "",
    price: initialData?.price || 0,
    level: initialData?.level || "Beginner",
  });

  const [thumbnail, setThumbnail] = useState(null);
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

    if (!formData.title.trim()) {
      newErrors.title = "Course title is required.";
    }

    if (!formData.code.trim()) {
      newErrors.code = "Course code is required.";
    }

    if (formData.credits !== "") {
      const creditsNum = Number(formData.credits);

      if (
        Number.isNaN(creditsNum) ||
        creditsNum <= 0
      ) {
        newErrors.credits =
          "Credits must be a positive number.";
      } else if (creditsNum > 12) {
        newErrors.credits =
          "Credits seem too high.";
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = {
      title: formData.title.trim(),
      code: formData.code.trim().toUpperCase(),
      credits:
        formData.credits !== ""
          ? Number(formData.credits)
          : 3,
      description: formData.description,
      price: Number(formData.price || 0),
      level: formData.level,
      thumbnailFile: thumbnail,
    };

    if (formData.instructorId) {
      payload.instructorId =
        formData.instructorId;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <InputField
        label="Course Title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        placeholder="Course Title"
        error={errors.title}
        required
      />

      <InputField
        label="Course Code"
        name="code"
        value={formData.code}
        onChange={handleChange}
        placeholder="CS101"
        error={errors.code}
        required
      />

      <InputField
        label="Credits"
        name="credits"
        type="number"
        min="1"
        max="12"
        value={formData.credits}
        onChange={handleChange}
        error={errors.credits}
      />

      <InputField
        label="Instructor"
        name="instructorId"
        as="select"
        value={formData.instructorId}
        onChange={handleChange}
        placeholder="Select Instructor"
        options={instructors.map((i) => ({
          value: i._id,
          label: `${i.name} — ${i.subject}`,
        }))}
        disabled={instructors.length === 0}
      />

      <InputField
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Course Description"
      />

      <InputField
        label="Price (₹)"
        name="price"
        type="number"
        value={formData.price}
        onChange={handleChange}
      />

      <InputField
        label="Level"
        name="level"
        as="select"
        value={formData.level}
        onChange={handleChange}
        options={[
          {
            value: "Beginner",
            label: "Beginner",
          },
          {
            value: "Intermediate",
            label: "Intermediate",
          },
          {
            value: "Advanced",
            label: "Advanced",
          },
        ]}
      />

      <div
        style={{
          marginBottom: "15px",
        }}
      >
        <label>Course Thumbnail</label>

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setThumbnail(
              e.target.files[0]
            )
          }
        />
      </div>

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
          icon={FiPlusCircle}
          loading={submitting}
          disabled={submitting}
        >
          {initialData
            ? "Update Course"
            : "Add Course"}
        </Button>
      </div>
    </form>
  );
};

export default CourseForm;