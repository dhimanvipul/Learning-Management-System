import apiClient from "./apiClient";

const authService = {
  sendPasswordOtp: async (email) => {
    const res = await apiClient.post("/auth/send-password-otp", { email });
    return res.data;
  },

  verifyPasswordOtp: async (email, otp) => {
    const res = await apiClient.post("/auth/verify-password-otp", { email, otp });
    return res.data;
  },

  changePassword: async (email, otp, newPassword) => {
    const res = await apiClient.put("/auth/change-password", { email, otp, newPassword });
    return res.data;
  },

  // Get auth profile by authId
  getProfile: async (authId) => {
    const res = await apiClient.get(`/auth/profile/${authId}`);
    return res.data;
  },

  // Update auth profile (admin profile update via auth table)
  updateProfile: async (authId, payload) => {
    const res = await apiClient.put(`/auth/profile/${authId}`, payload);
    return res.data;
  },

  // Upload avatar via auth
  uploadAvatar: async (authId, file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await apiClient.put(`/auth/avatar/${authId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

export default authService;