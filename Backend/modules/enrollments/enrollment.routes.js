const router = require("express").Router();
const ctrl = require("./enrollment.controller");

router.post("/", ctrl.enroll);

router.get("/", ctrl.getAllEnrollments);

router.get(
  "/instructor/:instructorId",
  ctrl.getInstructorStudents
);

router.get(
  "/student/:studentId",
  ctrl.getStudentEnrollments
);

router.get("/:id", ctrl.getEnrollmentById);

router.put("/:id", ctrl.updateEnrollment);

router.put("/:id/certificate", ctrl.issueCertificate);

router.delete("/:id", ctrl.deleteEnrollment);

module.exports = router;