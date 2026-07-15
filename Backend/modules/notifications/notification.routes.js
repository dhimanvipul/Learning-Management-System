const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  streamNotifications,
  getUnreadCount,
} = require("./notification.controller");

router.get("/", getNotifications);
router.get("/stream", streamNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllRead);
router.delete("/:id", deleteNotification);

module.exports = router;