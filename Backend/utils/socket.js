const { Server } = require("socket.io");

let io;
// Map to track online users: userId -> Set of socketIds (multiple tabs)
const onlineUsers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    let currentUserId = null;

    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join room for user notifications and messaging
    socket.on("join", ({ userId, role }) => {
      if (userId) {
        currentUserId = userId.toString();
        socket.join(currentUserId);
        
        // Track online status
        if (!onlineUsers.has(currentUserId)) {
          onlineUsers.set(currentUserId, new Set());
        }
        onlineUsers.get(currentUserId).add(socket.id);

        console.log(`👤 Client joined user room: ${currentUserId}`);
        
        // Broadcast that user is online
        io.emit("userOnline", { userId: currentUserId });
      }
      if (role) {
        socket.join(role);
        console.log(`👥 Client joined role room: ${role}`);
      }
    });

    // Handle typing events
    socket.on("typing", ({ conversationId, recipientId, senderId }) => {
      if (recipientId) {
        io.to(recipientId.toString()).emit("typing", { conversationId, senderId });
      }
    });

    socket.on("stopTyping", ({ conversationId, recipientId, senderId }) => {
      if (recipientId) {
        io.to(recipientId.toString()).emit("stopTyping", { conversationId, senderId });
      }
    });

    // Check if a user is online
    socket.on("checkOnlineStatus", ({ userId }, callback) => {
      const isOnline = onlineUsers.has(userId.toString()) && onlineUsers.get(userId.toString()).size > 0;
      if (typeof callback === "function") {
        callback({ userId, isOnline });
      }
    });

    // Get list of all online users
    socket.on("getOnlineUsers", (callback) => {
      const usersList = Array.from(onlineUsers.keys());
      if (typeof callback === "function") {
        callback(usersList);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const socketIds = onlineUsers.get(currentUserId);
        socketIds.delete(socket.id);
        
        if (socketIds.size === 0) {
          onlineUsers.delete(currentUserId);
          console.log(`👤 User offline: ${currentUserId}`);
          // Broadcast that user went offline
          io.emit("userOffline", { userId: currentUserId });
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

// Emit live notification payload
const emitNotification = (notification) => {
  if (!io) return;

  const payload = {
    _id: notification._id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    userId: notification.userId,
    receiverId: notification.receiverId,
    senderId: notification.senderId,
    senderRole: notification.senderRole,
    icon: notification.icon,
    relatedId: notification.relatedId,
    link: notification.link,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };

  if (notification.userId) {
    io.to(notification.userId.toString()).emit("notification", payload);
  }
  
  if (notification.receiverId && notification.receiverId.toString() !== notification.userId?.toString()) {
    io.to(notification.receiverId.toString()).emit("notification", payload);
  }

  if (notification.targetRole) {
    io.to(notification.targetRole).emit("notification", payload);
  }

  if (!notification.userId && !notification.receiverId && !notification.targetRole) {
    // General fallback
    io.emit("notification", payload);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitNotification,
};
