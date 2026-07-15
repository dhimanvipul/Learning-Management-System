import apiClient from "./apiClient";

const RESOURCE = "/instructors";

const instructorService = {
  getAll: async () => {
    const res = await apiClient.get(RESOURCE);
    return res.data?.data ?? [];
  },

  getById: async (id) => {
    const res = await apiClient.get(`${RESOURCE}/${id}`);
    return res.data?.data ?? null;
  },

  create: async (payload) => {
    const res = await apiClient.post(RESOURCE, payload);
    return res.data?.data ?? null;
  },

  update: async (id, payload) => {
    const res = await apiClient.put(`/instructors/${id}`, payload);
    return res.data?.data;
  },

  remove: async (id) => {
    const res = await apiClient.delete(`/instructors/${id}`);
    return res.data?.data;
  },

  getProfile: async (id) => {
    const res = await apiClient.get(`/instructors/profile/${id}`);
    return res.data?.data;
  },

  getDashboardStats: async (id) => {
    const res = await apiClient.get(`/instructors/${id}/dashboard-stats`);
    return res.data?.data;
  },

  getReports: async (id) => {
    const res = await apiClient.get(`/instructors/${id}/reports`);
    return res.data?.data;
  },

  updateStatus: async (id, status) => {
    const res = await apiClient.put(`/instructors/${id}/status`, { status });
    return res.data?.data;
  },

  // Upload profile image
  uploadProfileImage: async (id, file) => {
    const formData = new FormData();
    formData.append("profileImage", file);
    const res = await apiClient.put(`/instructors/${id}/profile-image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

export default instructorService;
