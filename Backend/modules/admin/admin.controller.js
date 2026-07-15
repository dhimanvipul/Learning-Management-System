const User = require("../auth/auth.model");
const Student = require("../students/student.model");
const Instructor = require("../instructors/instructor.model");
const Course = require("../courses/course.model");
const Enrollment = require("../enrollments/enrollment.model");
const Payment = require("../payments/payment.model");
const { success, error } = require("../../utils/apiResponse");

const getAdminReports = async (req, res) => {
  try {
    // 1. KPI Cards
    const totalActiveCourses = await Course.countDocuments();
    const totalEnrolledStudents = await Student.countDocuments();
    const payments = await Payment.find({ status: "success" });
    const totalRevenue = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pendingInstructorApprovals = await User.countDocuments({
      role: "instructor",
      status: "pending",
    });

    // 2. Growth trends (current calendar year, monthly signups)
    const currentYear = new Date().getFullYear();
    const studentGrowth = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i, 1).toLocaleDateString("en-US", { month: "short" }),
      students: 0,
      instructors: 0,
    }));

    const users = await User.find({
      createdAt: { $gte: new Date(currentYear, 0, 1) },
    });

    users.forEach((user) => {
      const month = new Date(user.createdAt).getMonth();
      if (user.role === "student") {
        studentGrowth[month].students += 1;
      } else if (user.role === "instructor") {
        studentGrowth[month].instructors += 1;
      }
    });

    // 3. Course Level distribution
    const courses = await Course.find();
    const levelDistribution = {
      Beginner: 0,
      Intermediate: 0,
      Advanced: 0,
    };
    courses.forEach((c) => {
      const level = c.level || "Beginner";
      if (levelDistribution[level] !== undefined) {
        levelDistribution[level] += 1;
      } else {
        levelDistribution.Beginner += 1;
      }
    });

    const levelData = Object.keys(levelDistribution).map((key) => ({
      name: key,
      value: levelDistribution[key],
    }));

    // 4. Enrollment status distribution
    const enrolls = await Enrollment.find();
    const enrollmentStatusDistribution = {
      approved: 0,
      pending: 0,
      rejected: 0,
    };
    enrolls.forEach((e) => {
      const status = e.status || "pending";
      if (enrollmentStatusDistribution[status] !== undefined) {
        enrollmentStatusDistribution[status] += 1;
      }
    });

    const enrollmentStatusData = Object.keys(enrollmentStatusDistribution).map((key) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: enrollmentStatusDistribution[key],
    }));

    return success(res, {
      kpis: {
        totalActiveCourses,
        totalEnrolledStudents,
        totalRevenue,
        pendingInstructorApprovals,
      },
      growth: studentGrowth,
      levelDistribution: levelData,
      enrollmentStatusDistribution: enrollmentStatusData,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = {
  getAdminReports,
};
