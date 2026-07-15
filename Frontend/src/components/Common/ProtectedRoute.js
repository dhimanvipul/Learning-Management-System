import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const userString = localStorage.getItem("user");

  // 1. If user is not authenticated, redirect to Login page
  if (!userString) {
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(userString);

    // 2. Check if user role is in the allowed roles list
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
      // Redirect to their default panel based on actual role
      if (user?.role === "admin") {
        return <Navigate to="/admin" replace />;
      } else if (user?.role === "instructor") {
        return <Navigate to="/instructor" replace />;
      } else if (user?.role === "student") {
        return <Navigate to="/student" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }

    // 3. User is authorized, render the child outlets
    return <Outlet />;
  } catch (err) {
    // If localstorage payload is corrupted, clear and redirect to login
    localStorage.removeItem("user");
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
