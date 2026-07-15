import io from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

let socket = null;
let _userId = null;
let _role = null;

const socketService = {
  // Connect socket and persist userId/role for auto-rejoin on reconnect
  connect: (userId, role) => {
    _userId = userId;
    _role = role;

    // If already connected, just rejoin the room (idempotent)
    if (socket && socket.connected) {
      socket.emit("join", { userId, role });
      return socket;
    }

    // If socket exists but not connected, remove it
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
      // Always re-join on connect/reconnect
      if (_userId) {
        socket.emit("join", { userId: _userId, role: _role });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("🔌 Socket connect error:", err.message);
    });

    socket.on("reconnect", (attempt) => {
      console.log("🔌 Socket reconnected after", attempt, "attempts");
      if (_userId) {
        socket.emit("join", { userId: _userId, role: _role });
      }
    });

    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    _userId = null;
    _role = null;
  },

  getSocket: () => socket,

  isConnected: () => !!(socket && socket.connected),

  // Ensure socket is connected before returning
  ensureConnected: () => {
    if (!socket || !socket.connected) {
      if (_userId && _role) {
        return socketService.connect(_userId, _role);
      }
    }
    return socket;
  },

  emit: (event, data) => {
    const s = socketService.ensureConnected();
    if (s) s.emit(event, data);
  },

  on: (event, callback) => {
    if (socket) socket.on(event, callback);
  },

  off: (event, callback) => {
    if (socket) socket.off(event, callback);
  }
};

export default socketService;
