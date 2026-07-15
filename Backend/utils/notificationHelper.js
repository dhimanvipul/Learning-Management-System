const User = require("../modules/auth/auth.model");
const Student = require("../modules/students/student.model");
const Instructor = require("../modules/instructors/instructor.model");
const Course = require("../modules/courses/course.model");
const { createNotification } = require("../modules/notifications/notification.controller");

// Notify a specific user using their email
const notifyUserByEmail = async (email, title, message, type, link = "") => {
  try {
    const user = await User.findOne({ email });
    if (user) {
      await createNotification(title, message, type, user._id, link, null);
    }
  } catch (err) {
    console.error("Error in notifyUserByEmail:", err.message);
  }
};

// Notify all administrators
const notifyAdmins = async (title, message, type, link = "") => {
  try {
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(title, message, type, admin._id, link, "admin");
    }
  } catch (err) {
    console.error("Error in notifyAdmins:", err.message);
  }
};

// Notify the instructor of a course
const notifyCourseInstructor = async (courseId, title, message, type, link = "") => {
  try {
    const course = await Course.findById(courseId).populate("instructorId");
    if (course && course.instructorId && course.instructorId.email) {
      await notifyUserByEmail(course.instructorId.email, title, message, type, link);
    }
  } catch (err) {
    console.error("Error in notifyCourseInstructor:", err.message);
  }
};

// Notify all students enrolled in a course
const notifyEnrolledStudents = async (courseId, title, message, type, link = "") => {
  try {
    const Enrollment = require("../modules/enrollments/enrollment.model");
    const enrollments = await Enrollment.find({ courseId }).populate("studentId");
    for (const enroll of enrollments) {
      if (enroll.studentId && enroll.studentId.email) {
        await notifyUserByEmail(enroll.studentId.email, title, message, type, link);
      }
    }
  } catch (err) {
    console.error("Error in notifyEnrolledStudents:", err.message);
  }
};

// Notify a specific user by their profile ID (student/instructor _id)
const notifyUserByProfileId = async (profileId, modelName, title, message, type, link = "") => {
  try {
    let email = null;
    if (modelName === "Student") {
      const student = await Student.findById(profileId);
      email = student?.email;
    } else if (modelName === "Instructor") {
      const instructor = await Instructor.findById(profileId);
      email = instructor?.email;
    }
    if (email) {
      await notifyUserByEmail(email, title, message, type, link);
    }
  } catch (err) {
    console.error("Error in notifyUserByProfileId:", err.message);
  }
};

module.exports = {
  notifyUserByEmail,
  notifyAdmins,
  notifyCourseInstructor,
  notifyEnrolledStudents,
  notifyUserByProfileId,
};
