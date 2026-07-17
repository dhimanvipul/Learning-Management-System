import React, { useState } from "react";
import apiClient from "../services/apiClient";
import { useNavigate, Link } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();

  // Primary Login Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Forgot Password Modal State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [submittingForgot, setSubmittingForgot] = useState(false);

  // Password Visibility Toggle State
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await apiClient.post(
        "/auth/login",
        formData
      );

      if (res.data.success) {
        const user = res.data.user;

        localStorage.setItem("user", JSON.stringify(user));
        alert("Login Successful");

        if (user.role === "admin") {
          navigate("/admin");
        } else if (user.role === "student") {
          navigate("/student");
        } else if (user.role === "instructor") {
          navigate("/instructor");
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      alert(error.friendlyMessage || "Login Failed");
    }
  };

  // Forgot Password step handlers
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return alert("Please enter your email address");

    setSubmittingForgot(true);
    try {
      const res = await apiClient.post(
        "/auth/send-password-otp",
        { email: forgotEmail }
      );
      if (res.data.success) {
        alert("OTP sent to your email address! 📧");
        setForgotStep(2);
      }
    } catch (err) {
      alert(err.friendlyMessage || "Failed to send OTP. Verify your email.");
    } finally {
      setSubmittingForgot(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!forgotOtp) return alert("Please enter the verification OTP");

    setSubmittingForgot(true);
    try {
      const res = await apiClient.post(
        "/auth/verify-password-otp",
        { email: forgotEmail, otp: forgotOtp }
      );
      if (res.data.success) {
        alert("OTP verified successfully! Set your new password.");
        setForgotStep(3);
      }
    } catch (err) {
      alert(err.friendlyMessage || "Invalid or expired OTP.");
    } finally {
      setSubmittingForgot(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !newPasswordConfirm) return alert("Please enter and confirm your new password");
    if (newPassword !== newPasswordConfirm) return alert("Passwords do not match");

    setSubmittingForgot(true);
    try {
      const res = await apiClient.put(
        "/auth/change-password",
        { email: forgotEmail, otp: forgotOtp, newPassword }
      );
      if (res.data.success) {
        alert("Password changed successfully! Please log in.");
        setIsForgotOpen(false);
        setForgotStep(1);
        setForgotEmail("");
        setForgotOtp("");
        setNewPassword("");
        setNewPasswordConfirm("");
      }
    } catch (err) {
      alert(err.friendlyMessage || "Failed to reset password.");
    } finally {
      setSubmittingForgot(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Login to your SkillVerse account</p>

        <form onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div className="password-input-wrapper">
            <input
              className="auth-input"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>

          <div className="forgot-password-link-wrap">
            <button
              type="button"
              className="forgot-password-btn"
              onClick={() => {
                setIsForgotOpen(true);
                setForgotStep(1);
              }}
            >
              Forgot Password?
            </button>
          </div>

          <button className="auth-btn" type="submit">
            Login
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Signup</Link>
        </div>
      </div>

      {/* Forgot Password Modal (Gold & White Theme) */}
      {isForgotOpen && (
        <div className="forgot-password-modal-overlay">
          <div className="forgot-password-modal-card">
            <div className="forgot-modal-header">
              <h2>Reset Password</h2>
              <button
                type="button"
                className="forgot-close-btn"
                onClick={() => setIsForgotOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="forgot-modal-body">
              {/* Step indicator */}
              <div className="forgot-steps-indicator">
                <span className={`step-dot ${forgotStep >= 1 ? "active" : ""}`}>1</span>
                <span className="step-line"></span>
                <span className={`step-dot ${forgotStep >= 2 ? "active" : ""}`}>2</span>
                <span className="step-line"></span>
                <span className={`step-dot ${forgotStep >= 3 ? "active" : ""}`}>3</span>
              </div>

              {/* Step 1: Send OTP */}
              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp}>
                  <p className="step-instructions">
                    Enter your registered email address to receive a 6-digit verification code.
                  </p>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="Enter email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                  <button
                    className="auth-btn"
                    type="submit"
                    disabled={submittingForgot}
                  >
                    {submittingForgot ? "Sending Code..." : "Send Reset Code"}
                  </button>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <p className="step-instructions">
                    We sent a verification code to <strong>{forgotEmail}</strong>. Enter it below.
                  </p>
                  <input
                    className="auth-input"
                    type="text"
                    maxLength={6}
                    placeholder="6-Digit OTP Code"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    required
                  />
                  <button
                    className="auth-btn"
                    type="submit"
                    disabled={submittingForgot}
                  >
                    {submittingForgot ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    className="back-step-btn"
                    onClick={() => setForgotStep(1)}
                  >
                    Back to Email
                  </button>
                </form>
              )}

              {/* Step 3: Change Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword}>
                  <p className="step-instructions">
                    Specify your new secure access credentials.
                  </p>
                  <div className="password-input-wrapper">
                    <input
                      className="auth-input"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  <div className="password-input-wrapper">
                    <input
                      className="auth-input"
                      type={showNewPasswordConfirm ? "text" : "password"}
                      placeholder="Confirm New Password"
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPasswordConfirm(!showNewPasswordConfirm)}
                    >
                      {showNewPasswordConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  <button
                    className="auth-btn"
                    type="submit"
                    disabled={submittingForgot}
                  >
                    {submittingForgot ? "Updating Password..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;