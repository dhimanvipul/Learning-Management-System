const router = require("express").Router();
const ctrl = require("./payment.controller");

router.post("/order", ctrl.createOrder);
router.post("/verify", ctrl.verifyPayment);
router.post("/webhook", ctrl.handleWebhook);
router.get("/", ctrl.getAllPayments);

module.exports = router;
