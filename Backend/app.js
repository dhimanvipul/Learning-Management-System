// app.js — builds the Express app and mounts every module under /api/v1
require("dotenv").config();
const express = require("express");
const cors    = require('cors');
const app = express();
const notificationRoutes = require("./modules/notifications/notification.routes");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/enrollments", require("./modules/enrollments/enrollment.routes"));

app.get("/", (req, res) =>
  res.json({ success: true, data: "LMS Backend (Phase 2 · MongoDB) is running" })
);

app.use("/api/v1/lessons", require("./modules/lessons/lesson.routes"));
app.use("/api/v1/auth", require("./modules/auth/auth.routes"));
app.use("/api/v1/sections", require("./modules/sections/section.routes"));
app.use("/api/v1/students", require("./modules/students/student.routes"));
app.use("/api/v1/courses", require("./modules/courses/course.routes"));
app.use("/api/v1/instructors", require("./modules/instructors/instructor.routes"));
app.use("/api/v1/enrollments", require("./modules/enrollments/enrollment.routes"));
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/assignments", (req, res, next) => {
  console.log(req.headers);
  next();
});

app.use("/api/assignments", require("./modules/assignment/assignment.routes"));
app.use("/api/v1/assignments", require("./modules/assignment/assignment.routes"));
app.use("/api/v1/payments", require("./modules/payments/payment.routes"));
app.use("/api/v1/admin", require("./modules/admin/admin.routes"));
app.use("/api/v1/search", require("./modules/search/search.routes"));
app.use("/api/chat", require("./modules/chat/chat.routes"));
app.use("/api/v1/chat", require("./modules/chat/chat.routes"));
app.use((req, res) =>
  res.status(404).json({ success: false, error: "Route not found" })
);

module.exports = app;