// modules/instructors/instructor.controller.js
const Instructor = require("./instructor.model");
const { success, error } = require("../../utils/apiResponse");
const User = require("../auth/auth.model");
const Course = require("../courses/course.model");
const Enrollment = require("../enrollments/enrollment.model");
const Assignment = require("../assignment/assignment.model");
const Submission = require("../assignment/submission.model");
const Lesson = require("../lessons/lesson.model");
const Section = require("../sections/section.model");
const Student = require("../students/student.model");

exports.createInstructor = async (req, res) => {
  try {
    const { name, subject, email, password } = req.body;

    const existingInstructor = await Instructor.findOne({ email });

    if (existingInstructor) {
      return error(res, "Instructor already exists", 400);
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return error(res, "User already exists", 400);
    }

    // Create Instructor
    const instructor = await Instructor.create({
      name,
      subject,
      email,
    });

    // Create Login Account
    const username = name
      .toLowerCase()
      .replace(/\s+/g, "_");

    await User.create({
      username,
      email,
      password,
      role: "instructor",
    });

    return success(res, instructor, 201);
  } catch (e) {
    return error(res, e.message, 400);
  }
};

exports.getAllInstructors = async (req, res) => {
  try {
    const list = await Instructor.find().sort({ createdAt: -1 }).lean();
    const joined = await Promise.all(
      list.map(async (inst) => {
        const user = await User.findOne({ email: inst.email });
        return {
          ...inst,
          status: user ? user.status : "approved",
          authId: user ? user._id : null,
        };
      })
    );
    success(res, joined);
  } catch (e) {
    error(res, e.message, 500);
  }
};

exports.updateInstructorStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return error(res, "Invalid status", 400);
    }

    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return error(res, "Instructor not found", 404);
    }

    const user = await User.findOneAndUpdate(
      { email: instructor.email },
      { status },
      { new: true }
    );

    if (status === "approved") {
      const { notifyUserByEmail } = require("../../utils/notificationHelper");
      notifyUserByEmail(
        instructor.email,
        "Instructor Account Approved",
        "Your instructor registration has been approved by the administrator. You can now login to your dashboard.",
        "instructor"
      );
    } else {
      const { notifyUserByEmail } = require("../../utils/notificationHelper");
      notifyUserByEmail(
        instructor.email,
        "Instructor Account Rejected",
        "Your instructor registration request was rejected by the administrator.",
        "instructor"
      );
    }

    return success(res, { instructor, user });
  } catch (e) {
    return error(res, e.message, 400);
  }
};

exports.getInstructorById = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) return error(res, "Instructor not found", 404);
    success(res, instructor);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.updateInstructor = async (req, res) => {
  try {
    const { name, email, phone, dob, profileImage } = req.body;

    const instructor = await Instructor.findById(req.params.id);

    if (!instructor) {
      return error(res, "Instructor not found", 404);
    }

    const oldEmail = instructor.email;

    instructor.name = name;
    instructor.email = email;
    instructor.phone = phone;
    instructor.dob = dob;
    instructor.profileImage = profileImage;

    await instructor.save();

    await User.findOneAndUpdate(
      { email: oldEmail },
      {
        email,
        fullName: name,
        phone,
        dob,
      }
    );

    return success(res, instructor);

  } catch (e) {
    return error(res, e.message, 400);
  }
};

exports.deleteInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findByIdAndDelete(req.params.id);
    if (!instructor) return error(res, "Instructor not found", 404);
    success(res, { message: "Instructor deleted successfully" });
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.getInstructorProfile = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);

    if (!instructor) {
      return error(res, "Instructor not found", 404);
    }

    return success(res, instructor);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const instructorId = req.params.id;

    // 1. Find all courses taught by the instructor
    const courses = await Course.find({ instructorId });
    const courseIds = courses.map((c) => c._id);

    // 2. Find all enrollments for these courses
    const enrollments = await Enrollment.find({
      courseId: { $in: courseIds },
    }).populate("studentId");

    // Clean enrollments to ensure student exists
    const validEnrollments = enrollments.filter((e) => e.studentId);
    
    // Count unique students
    const uniqueStudents = new Set(validEnrollments.map((e) => e.studentId._id.toString()));
    const totalStudents = uniqueStudents.size;

    // Count active courses (courses with enrollments)
    const enrolledCourseIds = new Set(validEnrollments.map((e) => e.courseId.toString()));
    const activeCoursesCount = enrolledCourseIds.size;

    // 3. Find all assignments for these courses
    const assignments = await Assignment.find({
      courseId: { $in: courseIds },
    });
    const assignmentIds = assignments.map((a) => a._id);

    // 4. Find all submissions
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
    });
    const pendingReviewsCount = submissions.filter((s) => s.status === "pending").length;

    // 5. Recent student enrollments (max 5)
    const recentEnrollments = await Enrollment.find({
      courseId: { $in: courseIds },
    })
      .populate("studentId", "name email")
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentStudents = recentEnrollments.map((e) => ({
      _id: e._id,
      name: e.studentId?.name || "Unknown",
      email: e.studentId?.email || "-",
      courseTitle: e.courseId?.title || "Unknown Course",
      enrolledAt: e.createdAt,
    }));

    // 6. Recent assignments submitted (max 5)
    const recentSubmissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
    })
      .populate("studentId", "name email")
      .populate("assignmentId", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentAssignments = recentSubmissions.map((s) => ({
      _id: s._id,
      studentName: s.studentId?.name || "Unknown",
      assignmentTitle: s.assignmentId?.title || "Untitled",
      status: s.status,
      submittedAt: s.createdAt,
    }));

    return success(res, {
      totalCourses: courses.length,
      totalStudents,
      activeCourses: activeCoursesCount,
      totalAssignments: assignments.length,
      pendingReviews: pendingReviewsCount,
      recentStudents,
      recentAssignments,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getReports = async (req, res) => {
  try {
    const instructorId = req.params.id;

    // Courses & assignments
    const courses = await Course.find({ instructorId });
    const courseIds = courses.map((c) => c._id);

    const enrollments = await Enrollment.find({
      courseId: { $in: courseIds },
    }).populate("studentId");
    const validEnrollments = enrollments.filter((e) => e.studentId);

    const uniqueStudents = new Set(validEnrollments.map((e) => e.studentId._id.toString()));
    const totalStudents = uniqueStudents.size;

    // Count active courses (courses with enrollments)
    const enrolledCourseIds = new Set(validEnrollments.map((e) => e.courseId.toString()));
    const activeCourses = enrolledCourseIds.size;

    const assignments = await Assignment.find({
      courseId: { $in: courseIds },
    });
    const assignmentIds = assignments.map((a) => a._id);

    // Lessons in courses
    const sections = await Section.find({ courseId: { $in: courseIds } });
    const sectionIds = sections.map((s) => s._id);
    const lessons = await Lesson.find({ sectionId: { $in: sectionIds } });

    // Uploaded content count (videos + PDFs)
    const totalUploadedContent = lessons.filter((l) => l.videoUrl || l.pdfUrl).length;

    // Submissions for assignment completion rate
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
    });

    // Calculate Assignment Completion %
    let totalExpectedSubmissions = 0;
    courses.forEach((course) => {
      const courseStudentsCount = validEnrollments.filter(
        (e) => e.courseId.toString() === course._id.toString()
      ).length;
      const courseAssignmentsCount = assignments.filter(
        (a) => a.courseId.toString() === course._id.toString()
      ).length;
      totalExpectedSubmissions += courseStudentsCount * courseAssignmentsCount;
    });

    const assignmentCompletionRate = totalExpectedSubmissions > 0
      ? Math.min(Math.round((submissions.length / totalExpectedSubmissions) * 100), 100)
      : 0;

    // Monthly enrollments (for the current calendar year)
    const currentYear = new Date().getFullYear();
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentYear, i, 1);
      return {
        month: date.toLocaleDateString("en-US", { month: "short" }),
        enrollments: 0,
      };
    });

    validEnrollments.forEach((e) => {
      const enrolledDate = new Date(e.createdAt);
      if (enrolledDate.getFullYear() === currentYear) {
        const monthIndex = enrolledDate.getMonth();
        monthlyData[monthIndex].enrollments += 1;
      }
    });

    // Course Statistics
    const courseStatistics = [];
    for (const course of courses) {
      const courseEnrollments = validEnrollments.filter(
        (e) => e.courseId.toString() === course._id.toString()
      );
      const courseSections = sections.filter(
        (s) => s.courseId.toString() === course._id.toString()
      );
      const courseSectionIds = courseSections.map((s) => s._id.toString());
      const courseLessons = lessons.filter((l) =>
        courseSectionIds.includes(l.sectionId.toString())
      );

      const totalProgress = courseEnrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0);
      const avgProgress = courseEnrollments.length > 0 ? Math.round(totalProgress / courseEnrollments.length) : 0;

      courseStatistics.push({
        _id: course._id,
        title: course.title,
        code: course.code || "-",
        level: course.level,
        studentsCount: courseEnrollments.length,
        lessonsCount: courseLessons.length,
        avgProgress,
      });
    }

    // Recent activity list
    const recentActivity = [];

    // Recent enrollments
    const recentEnrollments = await Enrollment.find({
      courseId: { $in: courseIds },
    })
      .populate("studentId", "name email")
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    recentEnrollments.forEach((e) => {
      if (e.studentId) {
        recentActivity.push({
          type: "enrollment",
          message: `${e.studentId.name} enrolled in ${e.courseId?.title || "a course"}`,
          createdAt: e.createdAt,
        });
      }
    });

    // Recent uploads
    lessons
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .forEach((l) => {
        recentActivity.push({
          type: "content",
          message: `New lesson "${l.title}" added`,
          createdAt: l.createdAt,
        });
      });

    // Recent submissions
    const recentSubmissions = await Submission.find({
      assignmentId: { $in: assignmentIds },
    })
      .populate("studentId", "name")
      .populate("assignmentId", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    recentSubmissions.forEach((s) => {
      if (s.studentId && s.assignmentId) {
        recentActivity.push({
          type: "submission",
          message: `${s.studentId.name} submitted assignment "${s.assignmentId.title}"`,
          createdAt: s.createdAt,
        });
      }
    });

    // Sort combined activities by date desc
    recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return success(res, {
      totalCourses: courses.length,
      activeCourses,
      totalStudents,
      totalLessons: lessons.length,
      totalAssignments: assignments.length,
      assignmentCompletionRate,
      totalUploadedContent,
      monthlyEnrollments: monthlyData,
      courseStatistics,
      recentActivity: recentActivity.slice(0, 8),
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const uploadToCloudinary = require("../../utils/cloudinaryUpload");

exports.uploadProfileImage = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) return error(res, "Instructor not found", 404);
    if (!req.file) return error(res, "Please upload an image", 400);

    const result = await uploadToCloudinary(req.file, "lms/profile-images");
    instructor.profileImage = result.secure_url;
    await instructor.save();

    await User.findOneAndUpdate(
      { email: instructor.email },
      { avatar: result.secure_url }
    );

    success(res, instructor);
  } catch (err) {
    error(res, err.message, 500);
  }
};