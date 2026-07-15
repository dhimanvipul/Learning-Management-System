const express = require("express");
const router = express.Router();
const ctrl = require("./admin.controller");

router.get("/reports", ctrl.getAdminReports);

module.exports = router;
