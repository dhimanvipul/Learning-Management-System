const router = require("express").Router();
const ctrl = require("./instructor.controller");
const upload = require("../../config/multer");

router.post("/", ctrl.createInstructor);
router.get("/", ctrl.getAllInstructors);

router.get("/profile/:id", ctrl.getInstructorProfile);
router.get("/:id/dashboard-stats", ctrl.getDashboardStats);
router.get("/:id/reports", ctrl.getReports);
router.get("/:id", ctrl.getInstructorById);

router.put("/:id/status", ctrl.updateInstructorStatus);
router.put("/:id/profile-image", upload.single("profileImage"), ctrl.uploadProfileImage);
router.put("/:id", ctrl.updateInstructor);
router.delete("/:id", ctrl.deleteInstructor);

module.exports = router;