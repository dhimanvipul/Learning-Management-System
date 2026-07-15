const router = require("express").Router();
const ctrl = require("./course.controller");
const upload = require("../../config/multer");

router.post("/", ctrl.createCourse);
router.get("/", ctrl.getAllCourses);
router.get(
  "/instructor/:instructorId",
  ctrl.getInstructorCourses
);
router.get("/:id", ctrl.getCourseById);
router.put("/:id", ctrl.updateCourse);


// 👇 Ye route hona chahiye
router.put(
  "/:id/thumbnail",
  upload.single("thumbnail"),
  ctrl.uploadThumbnail
);

router.delete("/:id", ctrl.deleteCourse);

module.exports = router;