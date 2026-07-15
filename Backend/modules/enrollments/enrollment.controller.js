// modules/enrollments/enrollment.controller.js
const Enrollment = require("./enrollment.model");
const Student = require("../students/student.model");
const Course = require("../courses/course.model");
const { success, error } = require("../../utils/apiResponse");

// links a student to a course (validates both exist in the DB)
exports.enroll = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return error(res, "studentId & courseId are required", 400);
    }

    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId).populate("instructorId");
    if (!student || !course) {
      return error(res, "Student or Course not found", 404);
    }

    const enrollment = await Enrollment.create({
      studentId,
      courseId,
      instructorId: course.instructorId?._id,
      status: "approved",
      progress: 0,
    });

    // Notify Instructor of new student enrollment
    try {
      const { notifyUserByEmail } = require("../../utils/notificationHelper");
      if (course.instructorId && course.instructorId.email) {
        notifyUserByEmail(
          course.instructorId.email,
          "New Student Enrolled",
          `Student ${student.name} has enrolled in your course "${course.title}".`,
          "enrollment",
          "/instructor/students"
        );
      }
    } catch (err) {
      console.error("Failed to notify instructor of enrollment:", err.message);
    }

    const populated = await enrollment.populate([
      { path: "studentId", select: "name email" },
      { path: "courseId", select: "title code" },
      { path: "instructorId", select: "name email" },
    ]);
    success(res, populated, 201);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.getAllEnrollments = async (req, res) => {
  try {
    // populate pulls in the linked student & course documents
    const list = await Enrollment.find()
      .populate("studentId", "name email")
      .populate("courseId", "title code")
      .populate("instructorId", "name email")
      .sort({ createdAt: -1 });
    success(res, list);
  } catch (e) {
    error(res, e.message, 500);
  }
};

exports.getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate("studentId", "name email")
      .populate("courseId", "title code")
      .populate("instructorId", "name email");
    if (!enrollment) return error(res, "Enrollment not found", 404);
    success(res, enrollment);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.updateEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("studentId", "name email")
      .populate("courseId", "title code")
      .populate("instructorId", "name email");
    if (!enrollment) return error(res, "Enrollment not found", 404);
    success(res, enrollment);
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
    if (!enrollment) return error(res, "Enrollment not found", 404);
    success(res, { message: "Enrollment deleted successfully" });
  } catch (e) {
    error(res, e.message, 400);
  }
};

exports.getStudentEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      studentId: req.params.studentId,
    })
      .populate("instructorId", "name email profileImage subject")
      .populate({
        path: "courseId",
        populate: {
          path: "instructorId",
          select: "name email profileImage subject",
        },
      })
      .sort({ createdAt: -1 });

    const enriched = [];
    for (let enrollment of enrollments) {
      if (enrollment.progress === 100 && (!enrollment.certificateStatus || enrollment.certificateStatus === "none")) {
        enrollment.certificateStatus = "pending";
        await enrollment.save();
      }
      enriched.push(enrollment);
    }

    return success(res, enriched);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.getInstructorStudents = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      instructorId: req.params.instructorId,
    })
      .populate("studentId", "name email")
      .populate("courseId", "title code")
      .sort({ createdAt: -1 });

    const Assignment = require("../assignment/assignment.model");
    const Submission = require("../assignment/submission.model");

    const enrichedEnrollments = [];
    for (let enrollment of enrollments) {
      if (!enrollment.courseId || !enrollment.studentId) continue;
      
      const totalAssignments = await Assignment.countDocuments({
        courseId: enrollment.courseId._id,
      });

      let submittedCount = 0;
      if (totalAssignments > 0) {
        const assignments = await Assignment.find({ courseId: enrollment.courseId._id });
        const assignmentIds = assignments.map(a => a._id);
        submittedCount = await Submission.countDocuments({
          studentId: enrollment.studentId._id,
          assignmentId: { $in: assignmentIds },
        });
      }

      let certStatus = enrollment.certificateStatus || "none";
      if (enrollment.progress === 100 && certStatus === "none") {
        enrollment.certificateStatus = "pending";
        await enrollment.save();
        certStatus = "pending";
      }

      enrichedEnrollments.push({
        _id: enrollment._id,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        instructorId: enrollment.instructorId,
        status: enrollment.status,
        progress: enrollment.progress,
        certificateStatus: certStatus,
        certificateId: enrollment.certificateId || "",
        certificateApprovedAt: enrollment.certificateApprovedAt || null,
        assignmentStatus: totalAssignments > 0 ? `${submittedCount}/${totalAssignments}` : "No Assignments",
        assignmentsCompleted: totalAssignments > 0 ? (submittedCount >= totalAssignments) : true,
      });
    }

    return success(res, enrichedEnrollments);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.issueCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return error(res, "Invalid status. Must be approved or rejected.", 400);
    }

    const enrollment = await Enrollment.findById(id)
      .populate("studentId", "name email")
      .populate("courseId", "title code instructorId");

    if (!enrollment) {
      return error(res, "Enrollment not found", 404);
    }

    enrollment.certificateStatus = status;
    if (status === "approved") {
      enrollment.certificateApprovedAt = new Date();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randHex = require("crypto").randomBytes(3).toString("hex").toUpperCase();
      enrollment.certificateId = `SV-${dateStr}-${randHex}`;
    } else {
      enrollment.certificateApprovedAt = null;
      enrollment.certificateId = "";
    }

    await enrollment.save();

    try {
      const { notifyUserByEmail, notifyAdmins } = require("../../utils/notificationHelper");
      if (enrollment.studentId && enrollment.studentId.email) {
        // Notify Student
        await notifyUserByEmail(
          enrollment.studentId.email,
          "Certificate Update",
          `Your certificate for course "${enrollment.courseId.title}" has been ${status}.`,
          "certificate",
          "/student/certificates"
        );

        if (status === "approved") {
          await notifyUserByEmail(
            enrollment.studentId.email,
            "Certificate Ready for Download",
            `Your certificate for "${enrollment.courseId.title}" is ready for download.`,
            "certificate",
            "/student/certificates"
          );

          await notifyUserByEmail(
            enrollment.studentId.email,
            "Certificate Approved",
            `Your certificate for "${enrollment.courseId.title}" has been approved.`,
            "certificate",
            "/student/certificates"
          );

          // Notify Admin
          await notifyAdmins(
            "Certificate Issued",
            `Certificate has been issued to student ${enrollment.studentId.name} for "${enrollment.courseId.title}".`,
            "certificate",
            "/admin/reports"
          );
          
          await notifyAdmins(
            "Certificate Approved",
            `Certificate approved for student ${enrollment.studentId.name} for "${enrollment.courseId.title}".`,
            "certificate",
            "/admin/reports"
          );

          // Notify Instructor (e.g. course instructor)
          if (enrollment.courseId?.instructorId && enrollment.courseId?.instructorId.email) {
            await notifyUserByEmail(
              enrollment.courseId.instructorId.email,
              "Certificate Approved",
              `Certificate approved for student ${enrollment.studentId.name} for "${enrollment.courseId.title}".`,
              "certificate",
              "/instructor/students"
            );
          }
        }
      }
    } catch (err2) {
      console.error("Error sending certificate notification:", err2.message);
    }

    success(res, enrollment);
  } catch (err) {
    error(res, err.message, 500);
  }
};