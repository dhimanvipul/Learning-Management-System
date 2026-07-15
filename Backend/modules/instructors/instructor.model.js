// modules/instructors/instructor.model.js
const mongoose = require("mongoose");

const instructorSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true },
    subject: { type: String, required: true },
    email:   { type: String, unique: true },
    phone: {
      type: String,
      default: "",
    },

    dob: {
      type: Date,
    },

    profileImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Instructor", instructorSchema);
