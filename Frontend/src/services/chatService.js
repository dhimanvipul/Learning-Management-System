import apiClient from "./apiClient";

const getHeaders = (userId, role) => {
  return {
    headers: {
      "x-user-id": userId,
      "x-user-role": role,
    },
  };
};

const chatService = {
  // Get conversations list
  getConversations: async (userId, role) => {
    try {
      const response = await apiClient.get("/chat/conversations", getHeaders(userId, role));
      return response.data;
    } catch (error) {
      throw error.friendlyMessage || error;
    }
  },

  // Get messages of a conversation
  getMessages: async (conversationId, userId) => {
    try {
      const response = await apiClient.get(`/chat/messages/${conversationId}`, {
        headers: { "x-user-id": userId }
      });
      return response.data;
    } catch (error) {
      throw error.friendlyMessage || error;
    }
  },

  // Send a message
  sendMessage: async (conversationId, userId, role, messageData) => {
    try {
      const response = await apiClient.post(
        "/chat/messages",
        { conversationId, ...messageData },
        getHeaders(userId, role)
      );
      return response.data;
    } catch (error) {
      throw error.friendlyMessage || error;
    }
  },

  // Start/Get a conversation
  startConversation: async (studentId, instructorId, userId) => {
    try {
      const response = await apiClient.post(
        "/chat/conversations",
        { studentId, instructorId },
        { headers: { "x-user-id": userId } }
      );
      return response.data;
    } catch (error) {
      throw error.friendlyMessage || error;
    }
  },

  // Get available chat partners (Student <-> Instructor based on enrollments)
  getChatPartners: async (userId, role) => {
    try {
      const response = await apiClient.get("/chat/partners", getHeaders(userId, role));
      return response.data;
    } catch (error) {
      throw error.friendlyMessage || error;
    }
  },

  // Upload chat attachment (Image, PDF, Document)
  uploadAttachment: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post("/chat/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw error.friendlyMessage || error;
    }
  },
};

export default chatService;
