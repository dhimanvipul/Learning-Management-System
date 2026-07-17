import apiClient from "./apiClient";

const RESOURCE = "/lessons";

const lessonService = {
  create: async (payload) => {
    const res = await apiClient.post(RESOURCE, payload);
    return res.data?.data ?? null;
  },

  getBySection: async (sectionId) => {
    const res = await apiClient.get(`${RESOURCE}/section/${sectionId}`);
    return res.data?.data ?? [];
  },

  uploadVideo: async (lessonId, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("video", file);

    const res = await apiClient.put(
      `${RESOURCE}/${lessonId}/video`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
      }
    );

    return res.data?.data;
  },

  uploadPdf: async (id, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("pdf", file);

    const res = await apiClient.put(
      `/lessons/${id}/pdf`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
      }
    );

    return res.data?.data;
  },

  update: async (id, payload) => {
    const res = await apiClient.put(`/lessons/${id}`, payload);
    return res.data?.data;
  },

  remove: async (id) => {
    const res = await apiClient.delete(`/lessons/${id}`);
    return res.data?.data;
  },

  updateProgress: async (payload) => {
    const res = await apiClient.put(`${RESOURCE}/progress/update`, payload);
    return res.data;
  },
};

export default lessonService;