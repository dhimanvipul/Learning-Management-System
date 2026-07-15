const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Target user (null = broadcast to all admins/all depending on targetRole)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },

    // ReceiverId (alias of userId for prompt compliance)
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },

    // Sender of the notification
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },

    senderRole: {
      type: String,
      default: "",
    },

    // Role targeting: "admin", "instructor", "student", "all"
    targetRole: {
      type: String,
      enum: ["admin", "instructor", "student", "all", null],
      default: null,
    },

    type: {
      type: String,
      enum: [
        "student",
        "course",
        "enrollment",
        "lesson",
        "instructor",
        "system",
        "assignment",
        "submission",
        "grade",
        "certificate",
        "payment",
        "announcement",
        "chat"
      ],
      default: "system",
    },

    icon: {
      type: String,
      default: "",
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },

    // Link to navigate on click
    link: {
      type: String,
      default: "",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add index on receiver/user for fast querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ receiverId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);