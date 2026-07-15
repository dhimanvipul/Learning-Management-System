import apiClient from "./apiClient";

const RESOURCE = "/students";

const studentService = {
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
    const res = await apiClient.put(`${RESOURCE}/${id}`, payload);
    return res.data?.data;
  },

  remove: async (id) => {
    const res = await apiClient.delete(`${RESOURCE}/${id}`);
    return res.data?.data;
  },

  // Upload profile image
  uploadProfileImage: async (id, file) => {
    const formData = new FormData();
    formData.append("profileImage", file);
    const res = await apiClient.put(`${RESOURCE}/${id}/profile-image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

export default studentService;
