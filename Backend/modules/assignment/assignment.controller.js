const Assignment = require("./assignment.model");
const Submission = require("./submission.model");
const uploadToCloudinary = require("../../utils/cloudinaryUpload");
const { success, error } = require("../../utils/apiResponse");

const User = require("../auth/auth.model");
const Student = require("../students/student.model");
const Course = require("../courses/course.model");
const Enrollment = require("../enrollments/enrollment.model");
const { createNotification } = require("../notifications/notification.controller");

// Create Assignment
exports.createAssignment = async (req, res) => {
  try {
    const { title, description, courseId, dueDate, marks } = req.body;
    let fileUrl = "";

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, "lms/assignments", "raw");
      fileUrl = uploadResult.secure_url;
    }

    const assignment = await Assignment.create({
      title,
      description: description || "",
      courseId,
      fileUrl,
      dueDate: dueDate ? new Date(dueDate) : null,
      marks: marks ? Number(marks) : 100,
    });

    // Trigger notifications for all enrolled students
    try {
      const enrollments = await Enrollment.find({ courseId }).populate("studentId");
      for (const enroll of enrollments) {
        if (enroll.studentId?.email) {
          const userAccount = await User.findOne({ email: enroll.studentId.email });
          if (userAccount) {
            await createNotification(
              "New Assignment Available",
              `A new assignment "${title}" has been posted in your course.`,
              "assignment",
              userAccount._id,
              "/student/assignments"
            );
          }
        }
      }
    } catch (notifErr) {
      console.error("Failed to generate assignment notification:", notifErr);
    }

    success(res, assignment, 201);
  } catch (err) {
    error(res, err.message, 400);
  }
};

// Edit / Update Assignment
exports.updateAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, marks } = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return error(res, "Assignment not found", 404);
    }

    let fileUrl = assignment.fileUrl;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, "lms/assignments", "raw");
      fileUrl = uploadResult.secure_url;
    }

    assignment.title = title || assignment.title;
    assignment.description = description !== undefined ? description : assignment.description;
    assignment.fileUrl = fileUrl;
    if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : null;
    if (marks !== undefined) assignment.marks = Number(marks);

    await assignment.save();
    success(res, assignment);
  } catch (err) {
    error(res, err.message, 400);
  }
};

// Get Assignments by Course
exports.getAssignmentsByCourse = async (req, res) => {
  try {
    const assignments = await Assignment.find({
      courseId: req.params.courseId,
    }).sort({ createdAt: -1 });

    success(res, assignments);
  } catch (err) {
    error(res, err.message, 500);
  }
};

// Delete Assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return error(res, "Assignment not found", 404);
    }
    // Delete any submissions associated with this assignment
    await Submission.deleteMany({ assignmentId: req.params.id });

    success(res, { message: "Assignment and associated submissions deleted successfully" });
  } catch (err) {
    error(res, err.message, 400);
  }
};

// Submit Assignment (Student)
exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentId, studentId } = req.body;
    if (!req.file) {
      return error(res, "Please upload your solution file", 400);
    }

    // Verify assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return error(res, "Assignment not found", 404);
    }

    // Check if student already submitted
    let submission = await Submission.findOne({ assignmentId, studentId });

    const uploadResult = await uploadToCloudinary(req.file, "lms/submissions", "raw");

    if (submission) {
      // Update submission
      submission.fileUrl = uploadResult.secure_url;
      submission.fileName = req.file.originalname;
      submission.status = "pending"; // reset status on resubmission
      submission.marks = null;
      submission.feedback = "";
      await submission.save();
    } else {
      // Create new submission
      submission = await Submission.create({
        assignmentId,
        studentId,
        fileUrl: uploadResult.secure_url,
        fileName: req.file.originalname,
        status: "pending",
      });
    }

    // Trigger notification to instructor and admin
    try {
      const populatedAssignment = await Assignment.findById(assignmentId).populate("courseId");
      if (populatedAssignment?.courseId) {
        const course = await Course.findById(populatedAssignment.courseId._id).populate("instructorId");
        if (course?.instructorId?.email) {
          const instructorUser = await User.findOne({ email: course.instructorId.email });
          if (instructorUser) {
            const studentInfo = await Student.findById(studentId);
            await createNotification(
              "New Assignment Submission",
              `Student ${studentInfo?.name || "Student"} submitted solution for assignment "${populatedAssignment.title}".`,
              "submission",
              instructorUser._id,
              "/instructor/students"
            );
          }
        }
      }

      // Notify admins of submission
      const studentInfo = await Student.findById(studentId);
      const { notifyAdmins } = require("../../utils/notificationHelper");
      await notifyAdmins(
        "Assignment Submitted",
        `Student ${studentInfo?.name || "Student"} submitted solution for assignment "${populatedAssignment?.title || "assignment"}".`,
        "submission",
        "/admin/reports"
      );
    } catch (notifErr) {
      console.error("Failed to generate submission notification:", notifErr);
    }

    success(res, submission, 201);
  } catch (err) {
    error(res, err.message, 400);
  }
};

// Get Submissions for an Assignment (Instructor view)
exports.getSubmissionsByAssignment = async (req, res) => {
  try {
    const submissions = await Submission.find({
      assignmentId: req.params.assignmentId,
    })
      .populate("studentId", "name email")
      .sort({ createdAt: -1 });

    success(res, submissions);
  } catch (err) {
    error(res, err.message, 500);
  }
};

// Evaluate Submission (Instructor grades and leaves feedback)
exports.evaluateSubmission = async (req, res) => {
  try {
    const { marks, feedback } = req.body;
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return error(res, "Submission not found", 404);
    }

    submission.marks = Number(marks);
    submission.feedback = feedback || "";
    submission.status = "evaluated";

    await submission.save();

    // Trigger notification to student
    try {
      const studentInfo = await Student.findById(submission.studentId);
      const assignmentInfo = await Assignment.findById(submission.assignmentId);
      if (studentInfo?.email) {
        const studentUser = await User.findOne({ email: studentInfo.email });
        if (studentUser) {
          await createNotification(
            "Assignment Graded",
            `Your submission for "${assignmentInfo?.title || "assignment"}" has been evaluated. Score: ${marks}/${assignmentInfo?.marks || 100}`,
            "grade",
            studentUser._id,
            "/student/assignments"
          );

          if (feedback) {
            await createNotification(
              "Instructor feedback",
              `Instructor left feedback on your submission for "${assignmentInfo?.title || "assignment"}": "${feedback}"`,
              "grade",
              studentUser._id,
              "/student/assignments"
            );
          }
        }
      }
    } catch (notifErr) {
      console.error("Failed to generate grading notification:", notifErr);
    }

    success(res, submission);
  } catch (err) {
    error(res, err.message, 400);
  }
};

// Get Submissions for a Student (Student view)
exports.getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      studentId: req.params.studentId,
    });
    success(res, submissions);
  } catch (err) {
    error(res, err.message, 500);
  }
};

// Remind enrolled students of upcoming assignment deadlines
exports.remindDeadlines = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return error(res, "Assignment not found", 404);
    }

    const enrollments = await Enrollment.find({ courseId: assignment.courseId }).populate("studentId");
    let count = 0;

    for (const enroll of enrollments) {
      if (enroll.studentId) {
        // Check if student has already submitted
        const hasSubmitted = await Submission.findOne({
          assignmentId,
          studentId: enroll.studentId._id
        });

        if (!hasSubmitted && enroll.studentId.email) {
          const userAccount = await User.findOne({ email: enroll.studentId.email });
          if (userAccount) {
            await createNotification(
              "Assignment deadline reminder",
              `Reminder: The assignment "${assignment.title}" is due on ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "soon"}. Please submit your solution.`,
              "assignment",
              userAccount._id,
              "/student/assignments"
            );
            count++;
          }
        }
      }
    }

    success(res, { message: `Reminders sent to ${count} students successfully.`, count });
  } catch (err) {
    error(res, err.message, 500);
  }
};