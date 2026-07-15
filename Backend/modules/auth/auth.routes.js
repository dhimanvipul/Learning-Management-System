const express = require("express");
const router = express.Router();
const upload = require("../../config/multer");

const {
  signup,
  login,
  getProfile,
  updateProfile,
  uploadAvatar,
  sendPasswordOtp,
  verifyPasswordOtp,
  changePassword,
} = require("./auth.controller");

router.post("/signup", signup);
router.post("/login", login);
router.get("/profile/:id", getProfile);
router.post("/send-password-otp", sendPasswordOtp);
router.post("/verify-password-otp", verifyPasswordOtp);
router.put("/change-password", changePassword);
router.put("/profile/:id", updateProfile);

router.put(
  "/avatar/:id",
  upload.single("avatar"),
  uploadAvatar
);
module.exports = router;