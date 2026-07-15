// modules/students/student.routes.js
const router = require("express").Router();
const ctrl = require("./student.controller");
const upload = require("../../config/multer");

router.post("/", ctrl.createStudent);
router.get("/", ctrl.getAllStudents);
router.get("/:id", ctrl.getStudentById);
router.put("/:id", ctrl.updateStudent);
router.put(
  "/:id/profile-image",
  upload.single("profileImage"),
  ctrl.uploadProfileImage
);
router.delete("/:id", ctrl.deleteStudent);

module.exports = router;
