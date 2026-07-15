import apiClient from "./apiClient";

const RESOURCE = "/assignments";

const assignmentService = {
  create: async (formData) => {
    const res = await apiClient.post(RESOURCE, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data?.data;
  },

  update: async (id, formData) => {
    const res = await apiClient.put(`${RESOURCE}/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data?.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`${RESOURCE}/${id}`);
    return res.data?.data;
  },

  getByCourse: async (courseId) => {
    const res = await apiClient.get(`${RESOURCE}/course/${courseId}`);
    return res.data?.data ?? [];
  },

  getSubmissions: async (assignmentId) => {
    const res = await apiClient.get(`${RESOURCE}/${assignmentId}/submissions`);
    return res.data?.data ?? [];
  },

  evaluateSubmission: async (submissionId, payload) => {
    const res = await apiClient.put(`${RESOURCE}/submission/${submissionId}/evaluate`, payload);
    return res.data?.data;
  },

  submitAssignment: async (formData) => {
    const res = await apiClient.post(`${RESOURCE}/submit`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data?.data;
  },

  getStudentSubmissions: async (studentId) => {
    const res = await apiClient.get(`${RESOURCE}/student/${studentId}`);
    return res.data?.data ?? [];
  },
};

export default assignmentService;
