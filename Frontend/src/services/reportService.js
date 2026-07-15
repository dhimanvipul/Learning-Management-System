import apiClient from "./apiClient";

const reportService = {
  getAdminReports: async () => {
    const res = await apiClient.get("/admin/reports");
    return res.data?.data ?? null;
  },
};

export default reportService;
