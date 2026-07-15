import apiClient from "./apiClient";

const RESOURCE = "/sections";

const sectionService = {
  create: async (payload) => {
    const res = await apiClient.post(RESOURCE, payload);
    return res.data?.data ?? null;
  },

  getByCourse: async (courseId) => {
    const res = await apiClient.get(`${RESOURCE}/course/${courseId}`);
    return res.data?.data ?? [];
  },

  update: async (id, payload) => {
    const res = await apiClient.put(`${RESOURCE}/${id}`, payload);
    return res.data?.data ?? null;
  },

  remove: async (id) => {
    const res = await apiClient.delete(`${RESOURCE}/${id}`);
    return res.data?.data ?? null;
  },
};

export default sectionService;