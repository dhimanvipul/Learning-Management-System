// modules/students/student.controller.js
const uploadToCloudinary = require("../../utils/cloudinaryUpload");
const Student = require("./student.model");
const User = require("../auth/auth.model");
const { success, error } = require("../../utils/apiResponse");
const {
  createNotification,
} = require("../notifications/notification.controller");
exports.createStudent = async (req, res) => {
  try {
    const student = await Student.create(req.body);
    await createNotification(
      "New Student",
      `${student.name} has been added.`,
      "student"
    );
    
    success(res, student, 201);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    success(res, await Student.find().sort({ createdAt: -1 }));
  } catch (e) {
    error(res, e.message, 500);
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return error(res, "Student not found", 404);
    success(res, student);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { name, email, phone, dob, bio, profileImage } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return error(res, "Student not found", 404);

    const oldEmail = student.email;

    if (name !== undefined) student.name = name;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (dob !== undefined) student.dob = dob;
    if (bio !== undefined) student.bio = bio;
    if (profileImage !== undefined) student.profileImage = profileImage;

    await student.save();

    // Sync with User table
    const updateFields = {};
    if (email !== undefined) updateFields.email = email;
    if (name !== undefined) updateFields.fullName = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (dob !== undefined) updateFields.dob = dob;
    if (bio !== undefined) updateFields.bio = bio;
    if (profileImage !== undefined) updateFields.avatar = profileImage;

    if (Object.keys(updateFields).length > 0) {
      await User.findOneAndUpdate({ email: oldEmail }, updateFields);
    }

    success(res, student);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return error(res, "Student not found", 404);
    }

    if (!req.file) {
      return error(res, "Please upload an image", 400);
    }

    const result = await uploadToCloudinary(
      req.file,
      "lms/profile-images"
    );

    student.profileImage = result.secure_url;

    await student.save();

    await User.findOneAndUpdate(
      { email: student.email },
      { avatar: result.secure_url }
    );

    success(res, student);
  } catch (err) {
    error(res, err.message, 500);
  }
};