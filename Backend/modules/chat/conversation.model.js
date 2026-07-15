const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    }
  },
  { timestamps: true }
);

// Create compound index for fast lookups
conversationSchema.index({ studentId: 1, instructorId: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", conversationSchema);
