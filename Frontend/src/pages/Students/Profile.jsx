import React, { useEffect, useRef, useState } from "react";
import studentService from "../../services/studentService";
import authService from "../../services/authService";
import enrollmentService from "../../services/enrollmentService";
import {
  FiUser, FiMail, FiPhone, FiCalendar, FiBook,
  FiEdit2, FiLock, FiSave, FiX, FiEye, FiEyeOff,
  FiSend, FiAward, FiCamera, FiTrash2, FiClock, FiKey,
  FiCheckCircle, FiTrendingUp, FiBarChart2
} from "react-icons/fi";
import "../Profile/Profile.css";

const toast = (msg, type = "success") => {
  const el = document.createElement("div");
  el.className = `profile-toast ${type}`;
  el.innerHTML = `<span>${type === "success" ? "✓" : "✕"}</span>${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

const StudentProfile = () => {
  const [profile, setProfile] = useState({
    name: "", email: "", phone: "", dob: "", profileImage: "",
  });
  const [enrollments, setEnrollments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwData, setPwData] = useState({ otp: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState({ new: false, confirm: false });
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [profileId, setProfileId] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const id = user._id;
    setProfileId(id);

    studentService.getById(id).then(data => {
      if (data) {
        setProfile({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          dob: data.dob ? data.dob.substring(0, 10) : "",
          profileImage: data.profileImage || "",
        });
        setCreatedAt(data.createdAt);
      }
    }).catch(() => {});

    enrollmentService.getStudentEnrollments(id).then(data => {
      if (Array.isArray(data)) setEnrollments(data);
    }).catch(() => {});
  }, []);

  const completed = enrollments.filter(e => e.progress === 100);
  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((a, c) => a + (c.progress || 0), 0) / enrollments.length)
    : 0;
  const certEarned = completed.filter(e => e.certificateStatus === "approved").length;

  const handleSave = async () => {
    if (!profileId) return toast("Session error", "error");
    setSaving(true);
    try {
      const updated = await studentService.update(profileId, {
        name: profile.name,
        phone: profile.phone,
        dob: profile.dob,
      });
      if (updated) {
        const user = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ ...user, name: profile.name }));
        window.dispatchEvent(new Event("userUpdate"));
        setEditing(false);
        toast("Profile updated successfully!");
      }
    } catch (err) {
      toast(err?.friendlyMessage || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !profileId) return;
    try {
      const res = await studentService.uploadProfileImage(profileId, file);
      if (res?.success || res?.data) {
        const imgUrl = res.data?.profileImage || res.data;
        const finalUrl = typeof imgUrl === "string" ? imgUrl : imgUrl?.profileImage || "";
        setProfile(p => ({ ...p, profileImage: finalUrl }));
        const user = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ ...user, avatar: finalUrl }));
        window.dispatchEvent(new Event("userUpdate"));
        toast("Photo updated!");
      }
    } catch {
      toast("Photo upload failed", "error");
    }
  };

  const handleRemovePhoto = async () => {
    if (!profileId) return;
    try {
      await studentService.update(profileId, { profileImage: "" });
      setProfile(p => ({ ...p, profileImage: "" }));
      const user = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ ...user, avatar: "" }));
      window.dispatchEvent(new Event("userUpdate"));
      toast("Photo removed.");
    } catch {
      toast("Failed to remove photo", "error");
    }
  };

  const handleSendOtp = async () => {
    setOtpLoading(true);
    try {
      await authService.sendPasswordOtp(profile.email);
      setOtpSent(true);
      toast("OTP sent to dhiman.vipul100@gmail.com");
    } catch {
      toast("Failed to send OTP", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwData.newPassword || pwData.newPassword !== pwData.confirmPassword)
      return toast("Passwords do not match", "error");
    if (!pwData.otp) return toast("Enter the OTP", "error");
    try {
      const res = await authService.changePassword(profile.email, pwData.otp, pwData.newPassword);
      if (res?.success) {
        toast("Password changed successfully!");
        setShowPasswordModal(false);
        setPwData({ otp: "", newPassword: "", confirmPassword: "" });
        setOtpSent(false);
      }
    } catch (err) {
      toast(err?.friendlyMessage || "Password change failed", "error");
    }
  };

  const initials = profile.name?.charAt(0)?.toUpperCase() || "S";
  const joinedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className="profile-page-wrapper">
      <div className="profile-page-header">
        <h1>👤 My Profile</h1>
        <p>Manage your learning profile and account settings.</p>
      </div>

      <div className="profile-layout">
        {/* ---- LEFT ---- */}
        <div className="profile-left-card">
          <div className="avatar-section">
            <div className="profile-avatar-circle">
              {profile.profileImage ? <img src={profile.profileImage} alt="Avatar" /> : initials}
            </div>
            <button className="avatar-edit-overlay" onClick={() => fileInputRef.current?.click()} title="Upload photo">
              <FiCamera size={13} />
            </button>
            <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handlePhotoUpload} />
          </div>

          <p className="profile-name-display">{profile.name || "Student"}</p>
          <span className="profile-role-badge role-student">Student</span>

          <div style={{ marginBottom: "14px" }}>
            <span className="status-badge-profile status-active">
              <FiCheckCircle size={11} /> Active Learner
            </span>
          </div>

          <div className="avatar-actions">
            <button className="btn-upload-photo" onClick={() => fileInputRef.current?.click()}>
              <FiCamera size={14} /> Upload
            </button>
            <button className="btn-remove-photo" onClick={handleRemovePhoto} disabled={!profile.profileImage}>
              <FiTrash2 size={14} /> Remove
            </button>
          </div>

          <div className="profile-quick-stats">
            <div className="quick-stat-item">
              <span className="quick-stat-label"><FiBook size={13} /> Enrolled</span>
              <span className="quick-stat-value gold">{enrollments.length}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label"><FiCheckCircle size={13} /> Completed</span>
              <span className="quick-stat-value gold">{completed.length}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label"><FiAward size={13} /> Certificates</span>
              <span className="quick-stat-value gold">{certEarned}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label"><FiBarChart2 size={13} /> Avg Progress</span>
              <span className="quick-stat-value gold">{avgProgress}%</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label"><FiCalendar size={13} /> Joined</span>
              <span className="quick-stat-value">{joinedDate}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {enrollments.length > 0 && (
            <div style={{ marginTop: "14px", borderTop: "1px solid var(--color-border)", paddingTop: "14px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "6px" }}>
                Overall Learning Progress
              </div>
              <div className="profile-progress-bar">
                <div className="profile-progress-fill" style={{ width: `${avgProgress}%` }} />
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-gold)", fontWeight: 700, marginTop: "4px", textAlign: "right" }}>
                {avgProgress}%
              </div>
            </div>
          )}
        </div>

        {/* ---- RIGHT ---- */}
        <div className="profile-right-col">
          <div className="profile-section-card">
            <div className="section-card-header">
              <div className="section-card-title"><FiUser size={18} /> Personal Information</div>
              {!editing && (
                <button className="btn-change-password" onClick={() => setEditing(true)}>
                  <FiEdit2 size={14} /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <>
                <div className="profile-form-grid">
                  {[
                    { label: "Full Name", key: "name", type: "text" },
                    { label: "Email Address", key: "email", type: "email", readOnly: true },
                    { label: "Phone Number", key: "phone", type: "tel" },
                    { label: "Date of Birth", key: "dob", type: "date" },
                  ].map(f => (
                    <div key={f.key} className="form-field">
                      <label>{f.label}</label>
                      <input
                        type={f.type}
                        value={profile[f.key] || ""}
                        readOnly={f.readOnly}
                        onChange={e => !f.readOnly && setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="profile-action-bar" style={{ marginTop: "20px" }}>
                  <button className="btn-save-profile" onClick={handleSave} disabled={saving}>
                    <FiSave size={15} /> {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="btn-change-password" onClick={() => setEditing(false)}>
                    <FiX size={14} /> Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="info-list">
                {[
                  { icon: FiUser, label: "Full Name", value: profile.name || "—" },
                  { icon: FiMail, label: "Email", value: profile.email || "—" },
                  { icon: FiPhone, label: "Phone", value: profile.phone || "—" },
                  { icon: FiCalendar, label: "Date of Birth", value: profile.dob ? new Date(profile.dob).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                  { icon: FiClock, label: "Member Since", value: joinedDate },
                ].map(row => (
                  <div key={row.label} className="info-row">
                    <div className="info-icon"><row.icon size={16} /></div>
                    <div className="info-content">
                      <div className="info-label">{row.label}</div>
                      <div className="info-value">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Learning Stats */}
          <div className="profile-section-card">
            <div className="section-card-header">
              <div className="section-card-title"><FiTrendingUp size={18} /> Learning Statistics</div>
            </div>
            <div className="info-list">
              {[
                { icon: FiBook, label: "Enrolled Courses", value: enrollments.length },
                { icon: FiCheckCircle, label: "Completed Courses", value: completed.length },
                { icon: FiAward, label: "Certificates Earned", value: certEarned },
                { icon: FiBarChart2, label: "Average Progress", value: `${avgProgress}%` },
              ].map(row => (
                <div key={row.label} className="info-row">
                  <div className="info-icon"><row.icon size={16} /></div>
                  <div className="info-content">
                    <div className="info-label">{row.label}</div>
                    <div className="info-value">{row.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="profile-action-bar" style={{ marginTop: "20px" }}>
              <button className="btn-change-password" onClick={() => setShowPasswordModal(true)}>
                <FiKey size={14} /> Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- PASSWORD MODAL ---- */}
      {showPasswordModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-box">
            <button className="modal-close-btn" onClick={() => { setShowPasswordModal(false); setOtpSent(false); setPwData({ otp: "", newPassword: "", confirmPassword: "" }); }}>
              <FiX />
            </button>
            <h3><FiLock style={{ marginRight: 8 }} />Change Password</h3>
            <p className="modal-sub">An OTP will be sent for verification.</p>
            <div className="modal-form">
              <div className="modal-input-group">
                <label>Email</label>
                <div className="modal-input-wrapper"><input type="email" value={profile.email} readOnly /></div>
              </div>
              <button className="modal-send-otp-btn" onClick={handleSendOtp} disabled={otpLoading}>
                <FiSend size={14} /> {otpLoading ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
              {otpSent && (
                <>
                  <div className="modal-input-group">
                    <label>OTP</label>
                    <div className="modal-input-wrapper">
                      <input type="text" placeholder="6-digit OTP" value={pwData.otp} onChange={e => setPwData(p => ({ ...p, otp: e.target.value }))} maxLength={6} />
                    </div>
                  </div>
                  {[
                    { label: "New Password", key: "newPassword", showKey: "new" },
                    { label: "Confirm Password", key: "confirmPassword", showKey: "confirm" },
                  ].map(f => (
                    <div key={f.key} className="modal-input-group">
                      <label>{f.label}</label>
                      <div className="modal-input-wrapper">
                        <input type={showPw[f.showKey] ? "text" : "password"} placeholder={f.label} value={pwData[f.key]} onChange={e => setPwData(p => ({ ...p, [f.key]: e.target.value }))} />
                        <button type="button" className="modal-eye-btn" onClick={() => setShowPw(p => ({ ...p, [f.showKey]: !p[f.showKey] }))}>{showPw[f.showKey] ? <FiEyeOff size={16} /> : <FiEye size={16} />}</button>
                      </div>
                    </div>
                  ))}
                  <div className="modal-action-row">
                    <button className="btn-modal-primary" onClick={handleChangePassword}>Update Password</button>
                    <button className="btn-modal-cancel" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;