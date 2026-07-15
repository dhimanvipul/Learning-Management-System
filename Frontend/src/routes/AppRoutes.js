import React from "react";
import { Routes, Route } from "react-router-dom";

// Route protection wrapper
import ProtectedRoute from "../components/Common/ProtectedRoute";

// Layouts
import AdminLayout from "../layouts/AdminLayout";
import StudentLayout from "../layouts/StudentLayout";
import InstructorLayout from "../layouts/InstructorLayout";

// Authentication
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import NotFound from "../pages/NotFound/NotFound";

// Admin Pages
import Dashboard from "../pages/Dashboard/Dashboard";
import Students from "../pages/Students/Students";
import StudentDetails from "../pages/Students/StudentDetails";
import Courses from "../pages/Courses/Courses";
import Instructors from "../pages/Instructors/Instructors";
import Enrollments from "../pages/Enrollments/Enrollments";
import CourseContent from "../pages/Courses/CourseContent";
import MyProfile from "../pages/Profile/MyProfile";
import Settings from "../pages/Settings/Settings";
import PaymentsHistory from "../pages/Payments/PaymentsHistory";
import AdminReports from "../pages/Reports/AdminReports";

// Student Pages
import StudentDashboard from "../pages/Students/Dashboard";
import MyCourses from "../pages/Students/MyCourses";
import Progress from "../pages/Students/Progress";
import Profile from "../pages/Students/Profile";
import CourseLearning from "../pages/Students/CourseLearning";
import LessonView from "../pages/Students/LessonView";
import ExploreCourses from "../pages/Students/ExploreCourses";
import MyCertificates from "../pages/Students/MyCertificates";

// Instructor Pages
import InstructorDashboard from "../pages/Instructor/Dashboard";
import InstructorMyCourses from "../pages/Instructor/InstructorMyCourses";
import InstructorStudents from "../pages/Instructor/InstructorStudent";
import InstructorProfile from "../pages/Instructor/InstructorProfile";
import InstructorReports from "../pages/Instructor/InstructorReports";
import IssueCertificates from "../pages/Instructor/IssueCertificates";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin Routes (Protected) */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetails />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:courseId/content" element={<CourseContent />} />
          <Route path="instructors" element={<Instructors />} />
          <Route path="enrollments" element={<Enrollments />} />
          <Route path="payments" element={<PaymentsHistory />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Student Routes (Protected) */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="explore" element={<ExploreCourses />} />
          <Route path="courses" element={<MyCourses />} />
          <Route path="courses/:courseId" element={<LessonView />} />
          <Route path="progress" element={<Progress />} />
          <Route path="profile" element={<Profile />} />
          <Route path="certificates" element={<MyCertificates />} />
          <Route path="course/:courseId" element={<CourseLearning />} />
        </Route>
      </Route>

      {/* Instructor Routes (Protected) */}
      <Route element={<ProtectedRoute allowedRoles={["instructor"]} />}>
        <Route path="/instructor" element={<InstructorLayout />}>
          <Route index element={<InstructorDashboard />} />
          <Route path="courses" element={<InstructorMyCourses />} />
          <Route path="students" element={<InstructorStudents />} />
          <Route path="course/:courseId" element={<CourseContent />} />
          <Route path="profile" element={<InstructorProfile />} />
          <Route path="certificates" element={<IssueCertificates />} />
          <Route path="reports" element={<InstructorReports />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;