const router = require("express").Router();
const ctrl = require("./lesson.controller");
const upload = require("../../config/multer");

router.post("/", ctrl.createLesson);

// 🔥 NEW
router.get("/course/:courseId", ctrl.getLessonsByCourse);

router.get("/section/:sectionId", ctrl.getLessonsBySection);

router.get("/:id", ctrl.getLessonById);

router.put("/:id", ctrl.updateLesson);

router.put("/progress/update", ctrl.updateProgress);

router.put(
  "/:id/video",
  upload.single("video"),
  ctrl.uploadVideo
);

router.put(
  "/:id/pdf",
  upload.single("pdf"),
  ctrl.uploadPdf
);

router.delete("/:id", ctrl.deleteLesson);

module.exports = router;