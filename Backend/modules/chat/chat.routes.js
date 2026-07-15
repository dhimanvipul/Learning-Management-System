const express = require("express");
const router = express.Router();
const upload = require("../../config/multer");
const {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  getChatPartners,
  uploadAttachment
} = require("./chat.controller");

// Real-time Chat Routes
router.get("/conversations", getConversations);
router.post("/conversations", startConversation);
router.get("/messages/:conversationId", getMessages);
router.post("/messages", sendMessage);
router.get("/partners", getChatPartners);
router.post("/upload", upload.single("file"), uploadAttachment);

module.exports = router;
