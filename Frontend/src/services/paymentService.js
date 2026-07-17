import apiClient from "./apiClient";

const RESOURCE = "/payments";

const paymentService = {
  getAll: async () => {
    const res = await apiClient.get(RESOURCE);
    return res.data?.data ?? [];
  },

  createOrder: async (studentId, courseId) => {
    const res = await apiClient.post(`${RESOURCE}/order`, { studentId, courseId });
    return res.data;
  },

  verifyPayment: async (payload) => {
    const res = await apiClient.post(`${RESOURCE}/verify`, payload);
    return res.data;
  },
};

export default paymentService;
