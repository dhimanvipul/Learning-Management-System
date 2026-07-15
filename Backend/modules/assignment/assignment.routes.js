const router = require("express").Router();
const ctrl = require("./assignment.controller");
const upload = require("../../config/multer");

router.post(
  "/",
  upload.single("file"),
  ctrl.createAssignment
);

router.put(
  "/:id",
  upload.single("file"),
  ctrl.updateAssignment
);

router.get(
  "/course/:courseId",
  ctrl.getAssignmentsByCourse
);

router.delete(
  "/:id",
  ctrl.deleteAssignment
);

// Student submits assignment
router.post(
  "/submit",
  upload.single("file"),
  ctrl.submitAssignment
);

// Instructor views submissions of a specific assignment
router.get(
  "/:assignmentId/submissions",
  ctrl.getSubmissionsByAssignment
);

// Instructor grades a submission
router.put(
  "/submission/:id/evaluate",
  ctrl.evaluateSubmission
);

// Student gets all their submissions
router.get(
  "/student/:studentId",
  ctrl.getStudentSubmissions
);

// Send deadline reminders
router.post(
  "/:assignmentId/remind",
  ctrl.remindDeadlines
);

module.exports = router;