import React, { useEffect, useRef, useState } from "react";
import authService from "../../services/authService";
import {
  FiUser, FiMail, FiPhone, FiCalendar, FiShield,
  FiEdit2, FiLock, FiSave, FiX, FiEye, FiEyeOff,
  FiSend, FiCheckCircle, FiCamera, FiTrash2, FiClock, FiKey
} from "react-icons/fi";
import "../Profile/Profile.css";

const toast = (msg, type = "success") => {
  const el = document.createElement("div");
  el.className = `profile-toast ${type}`;
  el.innerHTML = `<span>${type === "success" ? "✓" : "✕"}</span>${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

const MyProfile = () => {
  const [profile, setProfile] = useState({
    username: "", fullName: "", email: "", phone: "", dob: "", bio: "", avatar: "", role: "", status: "",
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwData, setPwData] = useState({ otp: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState({ new: false, confirm: false });
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [authId, setAuthId] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setAuthId(user.authId || user._id);
      setProfile({
        username: user.username || "",
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        dob: user.dob ? user.dob.substring(0, 10) : "",
        bio: user.bio || "",
        avatar: user.avatar || "",
        role: user.role || "admin",
        status: user.status || "approved",
      });
      // Fetch fresh from server
      const id = user.authId || user._id;
      authService.getProfile(id).then(res => {
        if (res?.success && res.data) {
          const d = res.data;
          const updated = {
            username: d.username || "",
            fullName: d.fullName || "",
            email: d.email || "",
            phone: d.phone || "",
            dob: d.dob ? d.dob.substring(0, 10) : "",
            bio: d.bio || "",
            avatar: d.avatar || "",
            role: d.role || "admin",
            status: d.status || "approved",
          };
          setProfile(updated);
          localStorage.setItem("user", JSON.stringify({ ...user, ...d }));
        }
      }).catch(() => {});
    }
  }, []);

  const handleSave = async () => {
    if (!authId) return toast("Session error. Please re-login.", "error");
    setSaving(true);
    try {
      const res = await authService.updateProfile(authId, {
        username: profile.username,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        dob: profile.dob,
        bio: profile.bio,
      });
      if (res?.success) {
        const user = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ ...user, ...res.data }));
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
    if (!file || !authId) return;
    try {
      const res = await authService.uploadAvatar(authId, file);
      if (res?.success) {
        const user = JSON.parse(localStorage.getItem("user"));
        const updated = { ...user, ...res.data };
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("userUpdate"));
        setProfile(p => ({ ...p, avatar: res.data.avatar || "" }));
        toast("Photo updated!");
      }
    } catch (err) {
      toast("Photo upload failed", "error");
    }
  };

  const handleRemovePhoto = async () => {
    if (!authId) return;
    try {
      const res = await authService.updateProfile(authId, { avatar: "" });
      if (res?.success) {
        const user = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ ...user, avatar: "" }));
        window.dispatchEvent(new Event("userUpdate"));
        setProfile(p => ({ ...p, avatar: "" }));
        toast("Photo removed.");
      }
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

  const initials = profile.username?.charAt(0)?.toUpperCase() || profile.fullName?.charAt(0)?.toUpperCase() || "A";
  const joinedDate = (() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
  })();

  return (
    <div className="profile-page-wrapper">
      <div className="profile-page-header">
        <h1>👤 My Profile</h1>
        <p>Manage your administrator account information and preferences.</p>
      </div>

      <div className="profile-layout">
        {/* ---- LEFT CARD ---- */}
        <div className="profile-left-card">
          <div className="avatar-section">
            <div className="profile-avatar-circle">
              {profile.avatar
                ? <img src={profile.avatar} alt="Avatar" />
                : initials}
            </div>
            <button className="avatar-edit-overlay" onClick={() => fileInputRef.current?.click()} title="Upload photo">
              <FiCamera size={13} />
            </button>
            <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handlePhotoUpload} />
          </div>

          <p className="profile-name-display">{profile.fullName || profile.username || "Administrator"}</p>
          <span className={`profile-role-badge role-${profile.role}`}>
            {profile.role === "admin" ? "Super Administrator" : profile.role}
          </span>

          <div style={{ marginBottom: "14px" }}>
            <span className={`status-badge-profile ${profile.status === "approved" ? "status-active" : "status-pending"}`}>
              <FiCheckCircle size={11} />
              {profile.status === "approved" ? "Active" : profile.status}
            </span>
          </div>

          <div className="avatar-actions">
            <button className="btn-upload-photo" onClick={() => fileInputRef.current?.click()}>
              <FiCamera size={14} /> Upload
            </button>
            <button className="btn-remove-photo" onClick={handleRemovePhoto} disabled={!profile.avatar}>
              <FiTrash2 size={14} /> Remove
            </button>
          </div>

          <div className="profile-quick-stats">
            <div className="quick-stat-item">
              <span className="quick-stat-label"><FiCalendar size={13} /> Joined</span>
              <span className="quick-stat-value">{joinedDate}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label"><FiShield size={13} /> Role</span>
              <span className="quick-stat-value gold">Administrator</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label"><FiClock size={13} /> Status</span>
              <span className="quick-stat-value" style={{ color: "#22c55e" }}>Active</span>
            </div>
          </div>
        </div>

        {/* ---- RIGHT COLUMN ---- */}
        <div className="profile-right-col">
          {/* Personal Info */}
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
                    { label: "Full Name", key: "fullName", type: "text" },
                    { label: "Username", key: "username", type: "text" },
                    { label: "Email Address", key: "email", type: "email" },
                    { label: "Phone Number", key: "phone", type: "tel" },
                    { label: "Date of Birth", key: "dob", type: "date" },
                  ].map(f => (
                    <div key={f.key} className="form-field">
                      <label>{f.label}</label>
                      <input
                        type={f.type}
                        value={profile[f.key] || ""}
                        onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="form-field">
                    <label>Bio</label>
                    <input
                      type="text"
                      value={profile.bio || ""}
                      onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Short bio..."
                    />
                  </div>
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
                  { icon: FiUser, label: "Full Name", value: profile.fullName || "—" },
                  { icon: FiUser, label: "Username", value: profile.username || "—" },
                  { icon: FiMail, label: "Email", value: profile.email || "—" },
                  { icon: FiPhone, label: "Phone", value: profile.phone || "—" },
                  { icon: FiCalendar, label: "Date of Birth", value: profile.dob ? new Date(profile.dob).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—" },
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

          {/* Account Info */}
          <div className="profile-section-card">
            <div className="section-card-header">
              <div className="section-card-title"><FiShield size={18} /> Account Information</div>
            </div>
            <div className="info-list">
              {[
                { icon: FiShield, label: "Role", value: "Super Administrator" },
                { icon: FiCheckCircle, label: "Account Status", value: "Active & Verified" },
                { icon: FiMail, label: "Email Verified", value: "Yes" },
                { icon: FiCalendar, label: "Member Since", value: joinedDate },
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
            <p className="modal-sub">An OTP will be sent to the registered email for verification.</p>
            <div className="modal-form">
              <div className="modal-input-group">
                <label>Email Address</label>
                <div className="modal-input-wrapper">
                  <input type="email" value={profile.email} readOnly />
                </div>
              </div>
              <button className="modal-send-otp-btn" onClick={handleSendOtp} disabled={otpLoading}>
                <FiSend size={14} /> {otpLoading ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
              {otpSent && (
                <>
                  <div className="modal-input-group">
                    <label>Enter OTP</label>
                    <div className="modal-input-wrapper">
                      <input type="text" placeholder="6-digit OTP" value={pwData.otp} onChange={e => setPwData(p => ({ ...p, otp: e.target.value }))} maxLength={6} />
                    </div>
                  </div>
                  {[
                    { label: "New Password", key: "newPassword", show: showPw.new, toggle: () => setShowPw(p => ({ ...p, new: !p.new })) },
                    { label: "Confirm Password", key: "confirmPassword", show: showPw.confirm, toggle: () => setShowPw(p => ({ ...p, confirm: !p.confirm })) },
                  ].map(f => (
                    <div key={f.key} className="modal-input-group">
                      <label>{f.label}</label>
                      <div className="modal-input-wrapper">
                        <input type={f.show ? "text" : "password"} placeholder={f.label} value={pwData[f.key]} onChange={e => setPwData(p => ({ ...p, [f.key]: e.target.value }))} />
                        <button type="button" className="modal-eye-btn" onClick={f.toggle}>{f.show ? <FiEyeOff size={16} /> : <FiEye size={16} />}</button>
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

export default MyProfile;