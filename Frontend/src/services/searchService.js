import apiClient from "./apiClient";

const searchService = {
  globalSearch: async (query) => {
    try {
      const res = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
      return res.data?.data || {
        students: [],
        courses: [],
        instructors: [],
        assignments: [],
        enrollments: []
      };
    } catch (err) {
      console.error("Global search error:", err);
      return {
        students: [],
        courses: [],
        instructors: [],
        assignments: [],
        enrollments: []
      };
    }
  }
};

export default searchService;
