import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FiX, FiSend, FiPaperclip, FiFileText,
  FiDownload, FiCheck, FiAlertCircle
} from "react-icons/fi";
import chatService from "../../services/chatService";
import socketService from "../../services/socketService";
import "./ChatDrawer.css";

/**
 * ChatDrawer — floating WhatsApp-style chat modal.
 * Props:
 *   partnerInfo : { _id, name, profileImage, role }
 *   currentUser : { _id, role }
 *   onClose     : function
 */
const ChatDrawer = ({ partnerInfo, currentUser, onClose }) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [initError, setInitError] = useState("");
  const [initLoading, setInitLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const conversationRef = useRef(null); // always-current conversation ref for socket handlers

  // Keep conversationRef in sync
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── STEP 1: Ensure socket is connected, then init conversation ──
  useEffect(() => {
    if (!partnerInfo || !currentUser) return;

    // Connect socket with current user before everything else
    socketService.connect(currentUser._id, currentUser.role);

    const init = async () => {
      setInitLoading(true);
      setInitError("");
      try {
        const studentId = currentUser.role === "student" ? currentUser._id : partnerInfo._id;
        const instructorId = currentUser.role === "instructor" ? currentUser._id : partnerInfo._id;

        const convRes = await chatService.startConversation(studentId, instructorId, currentUser._id);

        if (!convRes.success) {
          setInitError(convRes.error || "Cannot open chat. Please check enrollment.");
          setInitLoading(false);
          return;
        }

        const conv = convRes.data;
        setConversation(conv);

        // Load message history
        const msgRes = await chatService.getMessages(conv._id, currentUser._id);
        if (msgRes.success) {
          setMessages(msgRes.data);
        }
      } catch (err) {
        console.error("ChatDrawer init error details:", err);
        const errMsg = err.friendlyMessage || err.message || (typeof err === "string" ? err : "Failed to open chat. Please try again.");
        setInitError(errMsg);
      } finally {
        setInitLoading(false);
      }
    };

    init();
  }, [partnerInfo?._id, currentUser?._id]); // eslint-disable-line

  // ── STEP 2: Register socket listeners after conversation is set ──
  useEffect(() => {
    if (!conversation) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const conv = conversationRef.current;
      if (!conv) return;

      // Only process messages for this conversation
      const msgConvId = (msg.conversationId || "").toString();
      const currConvId = conv._id.toString();
      if (msgConvId !== currConvId) return;

      setMessages((prev) => {
        // Deduplicate by _id
        if (prev.some((m) => m._id && m._id.toString() === msg._id?.toString())) {
          return prev;
        }
        return [...prev, msg];
      });
      setIsTyping(false);
    };

    const handleTyping = ({ conversationId, senderId }) => {
      const conv = conversationRef.current;
      if (conv && conversationId === conv._id.toString() && senderId !== currentUser._id) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ conversationId }) => {
      const conv = conversationRef.current;
      if (conv && conversationId === conv._id.toString()) {
        setIsTyping(false);
      }
    };

    const handleMessagesRead = ({ conversationId }) => {
      const conv = conversationRef.current;
      if (conv && conversationId === conv._id.toString()) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    };

    const handleUserOnline = ({ userId }) => {
      if (userId === partnerInfo._id) setPartnerOnline(true);
    };

    const handleUserOffline = ({ userId }) => {
      if (userId === partnerInfo._id) setPartnerOnline(false);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);

    // Check partner online status
    socket.emit("checkOnlineStatus", { userId: partnerInfo._id }, (res) => {
      if (res) setPartnerOnline(res.isOnline);
    });

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, [conversation?._id, partnerInfo?._id, currentUser?._id]); // eslint-disable-line

  // ── Typing indicator emit ──
  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
    setSendError("");

    const conv = conversationRef.current;
    if (!conv) return;

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit("typing", {
        conversationId: conv._id.toString(),
        recipientId: partnerInfo._id,
        senderId: currentUser._id,
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", {
          conversationId: conv._id.toString(),
          recipientId: partnerInfo._id,
          senderId: currentUser._id,
        });
      }, 2000);
    }
  }, [partnerInfo._id, currentUser._id]);

  // ── Send Message ──
  const handleSend = async (e) => {
    e?.preventDefault();
    const conv = conversationRef.current;

    if ((!inputText.trim() && !selectedFile) || sending || !conv) return;

    const textToSend = inputText.trim();
    setSending(true);
    setSendError("");

    // Clear input immediately for better UX
    setInputText("");

    // Optimistically add message to UI
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      conversationId: conv._id,
      sender: currentUser._id,
      senderModel: currentUser.role === "student" ? "Student" : "Instructor",
      text: textToSend,
      fileUrl: "",
      fileName: "",
      fileType: "",
      isRead: false,
      delivered: false,
      createdAt: new Date().toISOString(),
      _isOptimistic: true,
    };

    if (!selectedFile) {
      setMessages((prev) => [...prev, optimisticMsg]);
    }

    let fileUrl = "";
    let fileName = "";
    let fileType = "";

    try {
      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        try {
          const uploadRes = await chatService.uploadAttachment(selectedFile);
          if (uploadRes.success) {
            fileUrl = uploadRes.data.secure_url;
            fileName = uploadRes.data.originalname;
            fileType = uploadRes.data.mimetype;
          }
        } finally {
          setUploading(false);
          setSelectedFile(null);
        }
      }

      // Send to backend
      const res = await chatService.sendMessage(
        conv._id,
        currentUser._id,
        currentUser.role,
        {
          text: textToSend,
          fileUrl,
          fileName,
          fileType,
          userId: currentUser._id,
          role: currentUser.role,
        }
      );

      if (res.success) {
        // Replace optimistic message with real one from server
        setMessages((prev) => {
          const filtered = prev.filter((m) => m._id !== optimisticMsg._id);
          // Check if socket already added the real message
          if (filtered.some((m) => m._id?.toString() === res.data._id?.toString())) {
            return filtered;
          }
          return [...filtered, res.data];
        });

        // Stop typing indicator
        const socket = socketService.getSocket();
        if (socket) {
          socket.emit("stopTyping", {
            conversationId: conv._id.toString(),
            recipientId: partnerInfo._id,
            senderId: currentUser._id,
          });
        }
      } else {
        // Remove optimistic message and show error
        setMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
        setInputText(textToSend); // restore input
        setSendError(res.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
      setInputText(textToSend); // restore input
      setSendError("Unable to send message. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  };

  const isMyMessage = (msg) => msg.sender?.toString() === currentUser._id?.toString();

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const initials = (name) => (name || "U").charAt(0).toUpperCase();

  return (
    <div className="chat-drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chat-drawer-panel">

        {/* ── Header ── */}
        <div className="chat-drawer-header">
          <div className="chat-drawer-partner-info">
            <div className="chat-drawer-avatar">
              {partnerInfo.profileImage ? (
                <img src={partnerInfo.profileImage} alt={partnerInfo.name} />
              ) : (
                <span>{initials(partnerInfo.name)}</span>
              )}
              {partnerOnline && <span className="chat-drawer-online-dot" />}
            </div>
            <div>
              <h3>{partnerInfo.name}</h3>
              <p className={partnerOnline ? "status-online" : "status-offline"}>
                {partnerOnline ? "● Online" : "○ Offline"}
              </p>
            </div>
          </div>
          <button className="chat-drawer-close-btn" onClick={onClose} title="Close">
            <FiX size={20} />
          </button>
        </div>

        {/* ── Messages body ── */}
        <div className="chat-drawer-messages">
          {initLoading && (
            <div className="chat-loading-state">
              <div className="chat-loading-spinner" />
              <span>Opening conversation...</span>
            </div>
          )}

          {initError && !initLoading && (
            <div className="chat-init-error">
              <FiAlertCircle size={20} />
              <p>{initError}</p>
            </div>
          )}

          {!initLoading && !initError && messages.length === 0 && (
            <div className="chat-empty-state">
              <span>👋</span>
              <p>No messages yet. Say hello!</p>
            </div>
          )}

          {Object.entries(groupedMessages).map(([date, dayMsgs]) => (
            <React.Fragment key={date}>
              <div className="chat-date-divider">
                <span>{formatDate(dayMsgs[0].createdAt)}</span>
              </div>
              {dayMsgs.map((msg, idx) => {
                const mine = isMyMessage(msg);
                return (
                  <div key={msg._id || idx} className={`chat-bubble-row ${mine ? "mine" : "theirs"}`}>
                    {!mine && (
                      <div className="chat-bubble-avatar">
                        {partnerInfo.profileImage ? (
                          <img src={partnerInfo.profileImage} alt="" />
                        ) : (
                          <span>{initials(partnerInfo.name)}</span>
                        )}
                      </div>
                    )}
                    <div className={`chat-bubble ${mine ? "mine" : "theirs"} ${msg._isOptimistic ? "optimistic" : ""}`}>
                      {/* File attachment */}
                      {msg.fileUrl && (
                        <div className="chat-attachment">
                          {msg.fileType?.startsWith("image/") ? (
                            <div className="chat-img-preview">
                              <img src={msg.fileUrl} alt={msg.fileName} />
                              <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="chat-dl-btn">
                                <FiDownload size={14} />
                              </a>
                            </div>
                          ) : (
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="chat-file-pill">
                              <FiFileText size={18} />
                              <span>{msg.fileName || "File"}</span>
                              <FiDownload size={14} />
                            </a>
                          )}
                        </div>
                      )}
                      {/* Text */}
                      {msg.text && <p className="chat-bubble-text">{msg.text}</p>}
                      {/* Footer: time + status ticks */}
                      <div className="chat-bubble-footer">
                        <span className="chat-time">{formatTime(msg.createdAt)}</span>
                        {mine && (
                          <span className={`chat-ticks ${msg.isRead ? "read" : msg.delivered ? "delivered" : "sending"}`}>
                            {msg._isOptimistic ? (
                              <span className="chat-tick-clock">⏳</span>
                            ) : msg.isRead ? (
                              <>
                                <FiCheck size={11} />
                                <FiCheck size={11} className="second-tick" />
                              </>
                            ) : (
                              <FiCheck size={11} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="chat-bubble-row theirs">
              <div className="chat-bubble-avatar">
                <span>{initials(partnerInfo.name)}</span>
              </div>
              <div className="chat-bubble theirs typing-bubble">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── File preview strip ── */}
        {selectedFile && (
          <div className="chat-file-preview-strip">
            <FiFileText size={16} />
            <span>{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} title="Remove">
              <FiX size={14} />
            </button>
          </div>
        )}

        {/* ── Send error message ── */}
        {sendError && (
          <div className="chat-send-error">
            <FiAlertCircle size={14} />
            <span>{sendError}</span>
          </div>
        )}

        {/* ── Input form ── */}
        <form className="chat-drawer-input-row" onSubmit={handleSend}>
          <label className="chat-attach-label" title="Attach file">
            <FiPaperclip size={18} />
            <input
              type="file"
              style={{ display: "none" }}
              accept="image/*,application/pdf"
              onChange={(e) => {
                setSelectedFile(e.target.files[0] || null);
                e.target.value = "";
              }}
            />
          </label>
          <input
            type="text"
            className="chat-drawer-text-input"
            placeholder="Type a message... (Enter to send)"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={sending || uploading || initLoading || !!initError}
            autoFocus
          />
          <button
            type="submit"
            className="chat-drawer-send-btn"
            disabled={(!inputText.trim() && !selectedFile) || sending || uploading || initLoading || !!initError}
            title="Send message"
          >
            <FiSend size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatDrawer;
