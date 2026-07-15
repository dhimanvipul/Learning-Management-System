import apiClient from "./apiClient";

const RESOURCE = "/payments";

const paymentService = {
  getAll: async () => {
    const res = await apiClient.get(RESOURCE);
    return res.data?.data ?? [];
  },
};

export default paymentService;
