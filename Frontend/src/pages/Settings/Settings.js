import React, { useState, useEffect } from "react";
import authService from "../../services/authService";
import {
  FiLock,
  FiMoon,
  FiSun,
  FiSend,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import "./Settings.css";

const Settings = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
    );

  const [email] = useState(user?.email || "");

  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleSendOtp = async () => {
    try {
      setLoading(true);

      const res = await authService.sendPasswordOtp(email);

      alert(res.message);
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await authService.verifyPasswordOtp(
        email,
        otp
      );

      alert(res.message);
    } catch (err) {
      alert(err.response?.data?.message || "Invalid OTP");
    }
  };

  const handleChangePassword = async () => {
    try {
      const res = await authService.changePassword(
        email,
        otp,
        newPassword
      );

      alert(res.message);

      setOtp("");
      setNewPassword("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="settings-page">

      <div className="settings-card">

        <h2>
          <FiLock />
          Change Password
        </h2>

        <div className="settings-form">

          <input
            type="email"
            value={email}
            readOnly
          />

          <button
            className="gold-btn"
            onClick={handleSendOtp}
            disabled={loading}
          >
            <FiSend />
            {loading ? "Sending..." : "Send OTP"}
          </button>

          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <button
            className="gold-btn"
            onClick={handleVerifyOtp}
          >
            <FiCheckCircle />
            Verify OTP
          </button>

          <div className="password-input-wrapper" style={{ position: "relative", width: "100%", marginBottom: "12px" }}>
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ paddingRight: "44px" }}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-gray-400)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>

          <button
            className="save-btn"
            onClick={handleChangePassword}
          >
            Change Password
          </button>

        </div>

      </div>

      <div className="settings-card">

        <h2>
          {darkMode ? <FiMoon /> : <FiSun />}
          Appearance
        </h2>

        <div className="theme-box">

          <span>
            {darkMode
              ? "Dark Mode"
              : "Light Mode"}
          </span>

          <label className="switch">

            <input
              type="checkbox"
              checked={darkMode}
              onChange={() =>
                setDarkMode(!darkMode)
              }
            />

            <span className="slider"></span>

          </label>

        </div>

      </div>

    </div>
  );
};

export default Settings;