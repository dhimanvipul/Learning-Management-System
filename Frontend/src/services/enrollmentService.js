import apiClient from "./apiClient";

const RESOURCE = "/enrollments";

const enrollmentService = {
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
    return res.data?.data ?? null;
  },

  remove: async (id) => {
    const res = await apiClient.delete(`${RESOURCE}/${id}`);
    return res.data?.data ?? null;
  },
  
  getInstructorStudents: async (instructorId) => {
    const res = await apiClient.get(
      `/enrollments/instructor/${instructorId}`
    );

    return res.data?.data ?? [];
  },

  getStudentEnrollments: async (studentId) => {
    const res = await apiClient.get(
      `/enrollments/student/${studentId}`
    );
    return res.data?.data ?? [];
  },

  issueCertificate: async (enrollmentId, status) => {
    const res = await apiClient.put(
      `/enrollments/${enrollmentId}/certificate`,
      { status }
    );
    return res.data?.data ?? null;
  },
};

export default enrollmentService;