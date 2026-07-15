import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiUsers,
  FiBookOpen,
  FiUserCheck,
  FiClipboard,
  FiX,
  FiAward,
  FiUser,
  FiBarChart2,
  FiCompass,
  FiDollarSign,
  FiLogOut,
} from "react-icons/fi";
import "./Sidebar.css";

const adminNavItems = [
  { path: "/admin", label: "Dashboard", icon: FiGrid, end: true },
  { path: "/admin/students", label: "Students", icon: FiUsers },
  { path: "/admin/courses", label: "Courses", icon: FiBookOpen },
  { path: "/admin/instructors", label: "Instructors", icon: FiUserCheck },
  { path: "/admin/enrollments", label: "Enrollments", icon: FiClipboard },
  { path: "/admin/payments", label: "Payment History", icon: FiDollarSign },
  { path: "/admin/reports", label: "Reports", icon: FiBarChart2 },
];

const studentNavItems = [
  { path: "/student", label: "Dashboard", icon: FiGrid, end: true },
  { path: "/student/explore", label: "Explore Courses", icon: FiCompass },
  { path: "/student/courses", label: "My Courses", icon: FiBookOpen },
  { path: "/student/progress", label: "Progress", icon: FiClipboard },
  { path: "/student/certificates", label: "My Certificates", icon: FiAward },
];

const instructorNavItems = [
  {
    path: "/instructor",
    label: "Dashboard",
    icon: FiGrid,
    end: true,
  },
  {
    path: "/instructor/courses",
    label: "My Courses",
    icon: FiBookOpen,
  },
  {
    path: "/instructor/students",
    label: "Students",
    icon: FiUsers,
  },
  {
    path: "/instructor/certificates",
    label: "Issue Certificates",
    icon: FiAward,
  },
  {
    path: "/instructor/reports",
    label: "Reports",
    icon: FiBarChart2,
  },
];

const Sidebar = ({ isOpen, onClose, role = "admin" }) => {
  const navigate = useNavigate();
  let navItems = adminNavItems;

  if (role === "student") {
    navItems = studentNavItems;
  }

  if (role === "instructor") {
    navItems = instructorNavItems;
  }

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "show" : ""}`}
        onClick={onClose}
      ></div>

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">
              <FiAward size={22} />
            </span>
            <div className="logo-text">
              <h2>
                LMS<span className="gold-dot">.</span>
              </h2>
              <p>
                {role === "admin"
                  ? "Admin Panel"
                  : role === "student"
                  ? "Student Panel"
                  : "Instructor Panel"}
              </p>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}>
            <FiX size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-label">Main Menu</p>
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? "sidebar-link active" : "sidebar-link"
                  }
                  onClick={onClose}
                >
                  <item.icon size={19} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <FiLogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
