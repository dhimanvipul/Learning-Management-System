const uploadToCloudinary = require("../../utils/cloudinaryUpload");
const Lesson = require("./lesson.model");
const { success, error } = require("../../utils/apiResponse");
const mongoose = require("mongoose");

// Create Lesson
exports.createLesson = async (req, res) => {
  try {
    const lesson = await Lesson.create(req.body);
    
    // Notify enrolled students of course content upload
    try {
      const Section = require("../sections/section.model");
      const section = await Section.findById(lesson.sectionId);
      if (section) {
        const { notifyEnrolledStudents } = require("../../utils/notificationHelper");
        notifyEnrolledStudents(
          section.courseId,
          "New Content Uploaded",
          `A new lesson "${lesson.title}" has been uploaded to the course.`,
          "course"
        );
      }
    } catch (notifErr) {
      console.error("Error sending lesson upload notification:", notifErr.message);
    }

    success(res, lesson, 201);
  } catch (err) {
    error(res, err.message, 400);
  }
};

// Get All Lessons of a Section
exports.getLessonsBySection = async (req, res) => {
  try {
    const lessons = await Lesson.find({
      sectionId: req.params.sectionId,
    }).sort({ order: 1 });

    success(res, lessons);
  } catch (err) {
    error(res, err.message, 500);
  }
};

// Get All Lessons By Course

exports.getLessonsByCourse = async (req, res) => {
  try {
    const Section = require("../sections/section.model");

    const sections = await Section.find({ courseId: req.params.courseId });
    const sectionIds = sections.map((s) => s._id);

    const lessons = await Lesson.find({
      sectionId: { $in: sectionIds },
    }).sort({ order: 1 });

    success(res, lessons);
  } catch (err) {
    console.log(err);
    error(res, err.message, 500);
  }
};

// Get Lesson By ID
exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return error(res, "Lesson not found", 404);
    }

    success(res, lesson);
  } catch (err) {
    error(res, err.message, 400);
  }
};

// Update Lesson
exports.updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!lesson) {
      return error(res, "Lesson not found", 404);
    }

    success(res, lesson);
  } catch (err) {
    error(res, err.message, 400);
  }
};

// Delete Lesson
exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);

    if (!lesson) {
      return error(res, "Lesson not found", 404);
    }

    success(res, {
      message: "Lesson deleted successfully",
    });
  } catch (err) {
    error(res, err.message, 400);
  }
};

// upload video
exports.uploadVideo = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return error(res, "Lesson not found", 404);
    }

    if (!req.file) {
      return error(res, "Please upload a video", 400);
    }

    const result = await uploadToCloudinary(
      req.file,
      "lms/course-videos",
      "video"
    );

    lesson.videoUrl = result.secure_url;

    await lesson.save();

    success(res, lesson);
  } catch (err) {
    error(res, err.message, 500);
  }
};

//upload PDF
exports.uploadPdf = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return error(res, "Lesson not found", 404);
    }

    if (!req.file) {
      return error(res, "Please upload a PDF", 400);
    }

    const result = await uploadToCloudinary(
      req.file,
      "lms/course-pdfs",
      "raw"
    );

    lesson.pdfUrl = result.secure_url;

    await lesson.save();

    success(res, lesson);
  } catch (err) {
    error(res, err.message, 500);
  }
};

// Update progress
exports.updateProgress = async (req, res) => {
  try {
    const { enrollmentId, progress } = req.body;

    const Enrollment = require("../enrollments/enrollment.model");
    const User = require("../auth/auth.model");
    const { notifyUserByEmail } = require("../../utils/notificationHelper");

    const updated = await Enrollment.findByIdAndUpdate(
      enrollmentId,
      { progress },
      { new: true }
    ).populate("studentId").populate("courseId");

    if (updated && updated.studentId && updated.courseId) {
      try {
        const Instructor = require("../instructors/instructor.model");
        const instructor = await Instructor.findById(updated.courseId.instructorId);
        if (instructor) {
          notifyUserByEmail(
            instructor.email,
            "Course Content Viewed",
            `Student ${updated.studentId.name} viewed content in course "${updated.courseId.title}". Progress: ${progress}%`,
            "lesson"
          );

          if (progress === 100) {
            // Student completed course -> notify instructor of course completion & certificate request
            await notifyUserByEmail(
              instructor.email,
              "Certificate Request",
              `Student ${updated.studentId.name} has completed 100% of "${updated.courseId.title}" and requested a certificate.`,
              "certificate",
              "/instructor/students"
            );
            await notifyUserByEmail(
              instructor.email,
              "Student Completed Course",
              `Student ${updated.studentId.name} has completed the course "${updated.courseId.title}".`,
              "course",
              "/instructor/students"
            );
            // Notify student of completion
            await notifyUserByEmail(
              updated.studentId.email,
              "Course Completed",
              `Congratulations! You have completed the course "${updated.courseId.title}".`,
              "course",
              "/student/my-courses"
            );
          }
        }
      } catch (err2) {
        console.error("Error creating progress notification:", err2.message);
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};