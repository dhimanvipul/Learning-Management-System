import apiClient from "./apiClient";

const RESOURCE = "/courses";

const courseService = {
  getAll: async () => {
    const res = await apiClient.get(RESOURCE);
    return res.data?.data ?? [];
  },

  getById: async (id) => {
    const res = await apiClient.get(`${RESOURCE}/${id}`);
    return res.data?.data ?? null;
  },

  create: async (payload) => {
    const { thumbnailFile, ...courseData } = payload;

    const res = await apiClient.post(
      RESOURCE,
      courseData
    );

    const course = res.data?.data;

    if (thumbnailFile && course?._id) {
      const formData = new FormData();

      formData.append(
        "thumbnail",
        thumbnailFile
      );

      await apiClient.put(
        `${RESOURCE}/${course._id}/thumbnail`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );
    }

    return course;
  },

  update: async (id, payload) => {
    const res = await apiClient.put(`${RESOURCE}/${id}`, payload);
    return res.data?.data ?? null;
  },

  remove: async (id) => {
    const res = await apiClient.delete(`${RESOURCE}/${id}`);
    return res.data?.data ?? null;
  },

  uploadThumbnail: async (courseId, file) => {
    const formData = new FormData();

    formData.append("thumbnail", file);

    const res = await apiClient.put(
      `/courses/${courseId}/thumbnail`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return res.data?.data;
  },
  
  getInstructorCourses: async (instructorId) => {
    const res = await apiClient.get(
      `/courses/instructor/${instructorId}`
    );

    return res.data?.data ?? [];
  },
};


export default courseService;
