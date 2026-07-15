const Student = require("../students/student.model");
const Course = require("../courses/course.model");
const Instructor = require("../instructors/instructor.model");
const Assignment = require("../assignment/assignment.model");
const Enrollment = require("../enrollments/enrollment.model");
const { success, error } = require("../../utils/apiResponse");

exports.globalSearch = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return success(res, {
        students: [],
        courses: [],
        instructors: [],
        assignments: [],
        enrollments: []
      });
    }

    const regex = new RegExp(query, "i");

    // 1. Search Students
    const students = await Student.find({
      $or: [{ name: regex }, { email: regex }]
    }).limit(5).lean();

    // 2. Search Courses
    const courses = await Course.find({
      $or: [{ title: regex }, { code: regex }]
    }).limit(5).lean();

    // 3. Search Instructors
    const instructors = await Instructor.find({
      $or: [{ name: regex }, { email: regex }, { subject: regex }]
    }).limit(5).lean();

    // 4. Search Assignments
    const assignments = await Assignment.find({
      $or: [{ title: regex }, { description: regex }]
    }).limit(5).lean();

    // 5. Search Enrollments
    const enrollments = await Enrollment.find()
      .populate("studentId")
      .populate("courseId")
      .lean();

    const filteredEnrollments = enrollments
      .filter((e) => {
        if (!e.studentId || !e.courseId) return false;
        const studentName = e.studentId.name || "";
        const courseTitle = e.courseId.title || "";
        return regex.test(studentName) || regex.test(courseTitle);
      })
      .slice(0, 5);

    return success(res, {
      students,
      courses,
      instructors,
      assignments,
      enrollments: filteredEnrollments
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};
