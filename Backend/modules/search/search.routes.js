const router = require("express").Router();
const ctrl = require("./search.controller");

router.get("/", ctrl.globalSearch);

module.exports = router;
