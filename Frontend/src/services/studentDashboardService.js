import api from "./api";

const studentDashboardService = {
  getDashboard: async () => {
    const response = await api.get("/student/dashboard");
    return response.data;
  },
};

export default studentDashboardService;