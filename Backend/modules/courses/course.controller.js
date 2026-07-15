// modules/courses/course.controller.js
const Course = require("./course.model");
const uploadToCloudinary = require("../../utils/cloudinaryUpload");
const { success, error } = require("../../utils/apiResponse");

exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    const populated = await course.populate("instructorId", "name subject email");

    try {
      const { createNotification } = require("../notifications/notification.controller");
      const { notifyAdmins, notifyUserByEmail } = require("../../utils/notificationHelper");

      // Notify Admins of course creation and pending review
      await notifyAdmins("Instructor Created Course", `Instructor has created a new course "${course.title}".`, "course", "/admin/courses");
      await notifyAdmins("Course Pending Review", `New course "${course.title}" is pending review.`, "course", "/admin/courses");

      // Notify Instructor of course approval
      if (course.instructorId) {
        const Instructor = require("../instructors/instructor.model");
        const inst = await Instructor.findById(course.instructorId);
        if (inst && inst.email) {
          await notifyUserByEmail(inst.email, "Course Approved", `Your course "${course.title}" has been approved.`, "course", "/instructor/courses");
        }
      }

      // Notify Students of published course
      await createNotification(
        "New Course Published",
        `A new course "${course.title}" has been published. Explore and enroll now!`,
        "course",
        null,
        "/student/explore",
        "student"
      );
    } catch (err) {
      console.error("Failed to trigger course notifications:", err.message);
    }

    success(res, populated, 201);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("instructorId", "name subject email")
      .sort({ createdAt: -1 });
    success(res, courses);
  } catch (e) {
    error(res, e.message, 500);
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "instructorId",
      "name subject email"
    );
    if (!course) return error(res, "Course not found", 404);
    success(res, course);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("instructorId", "name subject email");
    if (!course) return error(res, "Course not found", 404);

    // Notify instructor, admins, and enrolled students of course update
    try {
      const { notifyUserByEmail, notifyAdmins, notifyEnrolledStudents } = require("../../utils/notificationHelper");
      
      if (course.instructorId && course.instructorId.email) {
        await notifyUserByEmail(
          course.instructorId.email,
          "Course Updated",
          `Your course "${course.title}" has been updated.`,
          "course",
          "/instructor/courses"
        );
      }

      await notifyAdmins(
        "Course Updated",
        `Course "${course.title}" has been updated.`,
        "course",
        "/admin/courses"
      );

      await notifyEnrolledStudents(
        course._id,
        "Course Updated",
        `The course "${course.title}" has been updated with new content. Check it out!`,
        "course",
        "/student/my-courses"
      );
    } catch (notifErr) {
      console.error("Failed to send course update notifications:", notifErr.message);
    }

    success(res, course);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return error(res, "Course not found", 404);

    try {
       const { notifyAdmins } = require("../../utils/notificationHelper");
       await notifyAdmins("Course Deleted", `Course "${course.title}" has been deleted.`, "course");
    } catch (notifErr) {
       console.error("Failed to send course deletion notification:", notifErr.message);
    }

    success(res, { message: "Course deleted successfully" });
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.uploadThumbnail = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return error(res, "Course not found", 404);
    }

    if (!req.file) {
      return error(res, "Please upload a thumbnail", 400);
    }

    const result = await uploadToCloudinary(
      req.file,
      "lms/course-thumbnails"
    );

    course.thumbnail = result.secure_url;

    await course.save();

    success(res, course);
  } catch (err) {
    error(res, err.message, 500);
  }
};

exports.getInstructorCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      instructorId: req.params.instructorId,
    }).sort({ createdAt: -1 });

    const Enrollment = require("../enrollments/enrollment.model");
    const Assignment = require("../assignment/assignment.model");

    const enrichedCourses = [];
    for (let course of courses) {
      const studentCount = await Enrollment.countDocuments({
        courseId: course._id
      });

      const assignmentCount = await Assignment.countDocuments({
        courseId: course._id
      });

      const enrollmentsForCourse = await Enrollment.find({
        courseId: course._id
      });
      const totalProgress = enrollmentsForCourse.reduce((acc, curr) => acc + (curr.progress || 0), 0);
      const avgProgress = enrollmentsForCourse.length > 0 ? Math.round(totalProgress / enrollmentsForCourse.length) : 0;

      enrichedCourses.push({
        ...course.toObject(),
        studentsEnrolled: studentCount,
        assignmentsCount: assignmentCount,
        averageProgress: avgProgress
      });
    }

    success(res, enrichedCourses);
  } catch (e) {
    error(res, e.message, 500);
  }
};