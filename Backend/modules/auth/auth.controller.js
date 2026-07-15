const User = require("./auth.model");
const uploadToCloudinary = require("../../utils/cloudinaryUpload");
const transporter = require("../../config/mail");
const crypto = require("crypto");
const Student = require("../students/student.model");
const Instructor = require("../instructors/instructor.model");
const { notifyAdmins } = require("../../utils/notificationHelper");

const signup = async (req, res) => {
  try {
    const { username, email, password, role, fullName, phone } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const userRole = role || "student";
    const userStatus = userRole === "instructor" ? "pending" : "approved";

    const user = await User.create({
      username,
      email,
      password,
      role: userRole,
      fullName: fullName || "",
      phone: phone || "",
      status: userStatus,
    });

    // Create profile in respective collection
    if (userRole === "student") {
      await Student.create({
        name: fullName || username,
        email,
        phone: phone || "",
      });
      // Notify Admin of Student Signup
      notifyAdmins("New Student Signup", `Student ${fullName || username} (${email}) has signed up.`, "student");
    } else if (userRole === "instructor") {
      await Instructor.create({
        name: fullName || username,
        email,
        phone: phone || "",
        subject: "General",
      });
      // Notify Admin of Instructor Signup and Pending Approval
      notifyAdmins("New Instructor Registration", `Instructor ${fullName || username} (${email}) has registered.`, "instructor");
      notifyAdmins("Instructor Approval Pending", `Instructor ${fullName || username} registration is pending approval.`, "instructor");
    }

    res.status(201).json({
      success: true,
      message: userRole === "instructor" 
        ? "Signup successful! Your account is pending administrator approval."
        : "Signup successful",
      user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // User collection
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    if (user.password !== password) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Block pending or rejected instructors from logging in
    if (user.role === "instructor" && user.status !== "approved") {
      const msg = user.status === "rejected"
        ? "Your registration request has been rejected by the administrator."
        : "Your registration is currently pending administrator approval.";
      return res.status(403).json({
        success: false,
        message: msg,
      });
    }

    let profileId = user._id;

    // Student login
    if (user.role === "student") {
      const student = await Student.findOne({ email });

      if (student) {
        profileId = student._id;
      }
    }

    // Instructor login
    if (user.role === "instructor") {
      const instructor = await Instructor.findOne({ email });

      if (instructor) {
        profileId = instructor._id;
      }
    }

    return res.json({
      success: true,
      user: {
        _id: profileId,
        authId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      username,
      email,
      fullName,
      phone,
      dob,
      bio,
      avatar,
    } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        username,
        email,
        fullName,
        phone,
        dob,
        bio,
        avatar,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image",
      });
    }

    const result = await uploadToCloudinary(
      req.file,
      "avatars"
    );

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        avatar: result.secure_url,
      },
      {
        new: true,
      }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const sendPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    user.passwordOtp = otp;
    user.passwordOtpExpire = Date.now() + 5 * 60 * 1000;

    await user.save();

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: "dhiman.vipul100@gmail.com",
      subject: "LMS Password Reset OTP",
      html: `
        <h2>Password Reset</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP expires in 5 minutes.</p>
      `,
    });

    res.json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const verifyPasswordOtp = async (req, res) => {
  try {

    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      user.passwordOtp !== otp ||
      user.passwordOtpExpire < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or Expired OTP",
      });
    }

    res.json({
      success: true,
      message: "OTP Verified",
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};

const changePassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      user.passwordOtp !== otp ||
      user.passwordOtpExpire < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP Expired",
      });
    }

    await User.findByIdAndUpdate(
      user._id,
      {
        password: newPassword,
        passwordOtp: "",
        passwordOtpExpire: null,
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Password Changed Successfully",
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
  uploadAvatar,
  sendPasswordOtp,
  verifyPasswordOtp,
  changePassword,
};