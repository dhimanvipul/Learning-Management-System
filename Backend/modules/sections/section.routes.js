const router = require("express").Router();
const ctrl = require("./section.controller");

router.post("/", ctrl.createSection);

router.get("/course/:courseId", ctrl.getSectionsByCourse);

router.put("/:id", ctrl.updateSection);

router.delete("/:id", ctrl.deleteSection);

module.exports = router;