import apiClient from "./apiClient";

const notificationService = {
  getNotifications: async (userId, role) => {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (role) params.append("role", role);
    const url = `/notifications?${params.toString()}`;
    const res = await apiClient.get(url);
    return res.data;
  },

  markAsRead: async (id) => {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async (userId) => {
    const res = await apiClient.put("/notifications/read-all", { userId });
    return res.data;
  },

  deleteNotification: async (id) => {
    const res = await apiClient.delete(`/notifications/${id}`);
    return res.data;
  },

  getUnreadCount: async (userId, role) => {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (role) params.append("role", role);
    const url = `/notifications/unread-count?${params.toString()}`;
    const res = await apiClient.get(url);
    return res.data;
  },
};

export default notificationService;