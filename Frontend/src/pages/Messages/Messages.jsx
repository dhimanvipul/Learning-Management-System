import React, { useState, useEffect, useRef } from "react";
import { 
  FiSearch, FiSend, FiPaperclip, FiFileText, FiImage, 
  FiCheck, FiDownload, FiTrash2, FiUser, FiInfo 
} from "react-icons/fi";
import chatService from "../../services/chatService";
import socketService from "../../services/socketService";
import "./Messages.css";

const Messages = () => {
  const [currentUser, setCurrentUser] = useState(null);
  
  // Conversations and Messages
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [partners, setPartners] = useState([]); // List of users they can start chat with
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatList, setShowNewChatList] = useState(false);
  
  // Form input
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Real-time states
  const [typingUsers, setTypingUsers] = useState({}); // convId -> boolean
  const [onlineUsersList, setOnlineUsersList] = useState([]);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Fetch initial user and set up Socket
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setCurrentUser(user);
      
      // Connect to Socket
      const socket = socketService.connect(user._id, user.role);
      
      // Fetch conversations and partners
      loadConversations(user._id, user.role);
      loadPartners(user._id, user.role);
      
      // Get online users list
      socket.emit("getOnlineUsers", (list) => {
        setOnlineUsersList(list || []);
      });
      
      // Setup socket listeners
      socket.on("userOnline", ({ userId }) => {
        setOnlineUsersList((prev) => [...new Set([...prev, userId])]);
      });
      
      socket.on("userOffline", ({ userId }) => {
        setOnlineUsersList((prev) => prev.filter(id => id !== userId));
      });
      
      socket.on("typing", ({ conversationId, senderId }) => {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: true }));
      });
      
      socket.on("stopTyping", ({ conversationId, senderId }) => {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: false }));
      });
      
      // Request browser notification permission
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    
    return () => {
      // Clean up socket listeners on unmount
      const socket = socketService.getSocket();
      if (socket) {
        socket.off("userOnline");
        socket.off("userOffline");
        socket.off("typing");
        socket.off("stopTyping");
      }
    };
  }, []);

  // 2. Separate useEffect for activeConversation messages listener
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !currentUser) return;

    const handleNewMessage = (msg) => {
      // Check if message belongs to active conversation
      if (activeConversation && msg.conversationId === activeConversation._id) {
        setMessages((prev) => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        
        // Mark as read in backend
        if (msg.sender !== currentUser._id) {
          chatService.getMessages(activeConversation._id, currentUser._id)
            .then(() => {
              // Update local conversations list unread counts
              updateConversationUnread(msg.conversationId, 0);
            })
            .catch(console.error);
        }
      } else {
        // Increment unread count for that conversation in list
        setConversations((prev) => 
          prev.map((conv) => {
            if (conv._id === msg.conversationId) {
              return {
                ...conv,
                lastMessage: msg,
                unreadCount: (conv.unreadCount || 0) + (msg.sender !== currentUser._id ? 1 : 0),
                updatedAt: new Date().toISOString()
              };
            }
            return conv;
          }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );

        // Show browser notification if message from someone else
        if (msg.sender !== currentUser._id) {
          const partnerName = currentUser.role === "student" ? "Instructor" : "Student";
          showBrowserNotification(msg, partnerName);
        }
      }
    };

    const handleMessagesRead = ({ conversationId, readBy }) => {
      if (activeConversation && conversationId === activeConversation._id && readBy !== currentUser._id) {
        setMessages((prev) => prev.map(m => ({ ...m, isRead: true })));
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [activeConversation, currentUser]);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const loadConversations = async (userId, role) => {
    try {
      const res = await chatService.getConversations(userId, role);
      if (res.success) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  const loadPartners = async (userId, role) => {
    try {
      const res = await chatService.getChatPartners(userId, role);
      if (res.success) {
        setPartners(res.data);
      }
    } catch (err) {
      console.error("Error fetching partners:", err);
    }
  };

  const updateConversationUnread = (conversationId, count) => {
    setConversations((prev) => 
      prev.map((conv) => 
        conv._id === conversationId ? { ...conv, unreadCount: count } : conv
      )
    );
  };

  const handleSelectConversation = async (conv) => {
    setActiveConversation(conv);
    try {
      const res = await chatService.getMessages(conv._id, currentUser._id);
      if (res.success) {
        setMessages(res.data);
        updateConversationUnread(conv._id, 0);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const handleStartChatWithPartner = async (partner) => {
    try {
      const studentId = currentUser.role === "student" ? currentUser._id : partner._id;
      const instructorId = currentUser.role === "instructor" ? currentUser._id : partner._id;
      
      const res = await chatService.startConversation(studentId, instructorId, currentUser._id);
      if (res.success) {
        // Reload conversations to make sure it's in list
        await loadConversations(currentUser._id, currentUser.role);
        setActiveConversation(res.data);
        setShowNewChatList(false);
        setSearchQuery("");
        
        // Fetch messages for new active conversation
        const msgRes = await chatService.getMessages(res.data._id, currentUser._id);
        if (msgRes.success) {
          setMessages(msgRes.data);
        }
      }
    } catch (err) {
      console.error("Error starting conversation:", err);
    }
  };

  const showBrowserNotification = (msg, senderRoleName) => {
    if (Notification.permission === "granted") {
      new Notification(`New message from ${senderRoleName}`, {
        body: msg.text || "Shared a file",
        icon: "/logo192.png"
      });
    }
  };

  // Typing indicators
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (!activeConversation) return;
    
    const socket = socketService.getSocket();
    if (socket) {
      const recipientId = getPartner(activeConversation)._id;
      socket.emit("typing", {
        conversationId: activeConversation._id,
        recipientId,
        senderId: currentUser._id
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", {
          conversationId: activeConversation._id,
          recipientId,
          senderId: currentUser._id
        });
      }, 2000);
    }
  };

  // Attachment handle
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview("doc");
      }
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || uploading) return;

    setUploading(true);
    let fileUrl = "";
    let fileName = "";
    let fileType = "";

    try {
      if (selectedFile) {
        const uploadRes = await chatService.uploadAttachment(selectedFile);
        if (uploadRes.success) {
          fileUrl = uploadRes.data.secure_url;
          fileName = uploadRes.data.originalname;
          fileType = uploadRes.data.mimetype;
        }
      }

      const payload = {
        text: inputText,
        fileUrl,
        fileName,
        fileType,
        userId: currentUser._id,
        role: currentUser.role
      };

      const res = await chatService.sendMessage(activeConversation._id, currentUser._id, currentUser.role, payload);
      
      if (res.success) {
        setInputText("");
        clearFileSelection();
        
        // Stop typing immediately
        const socket = socketService.getSocket();
        if (socket) {
          const recipientId = getPartner(activeConversation)._id;
          socket.emit("stopTyping", {
            conversationId: activeConversation._id,
            recipientId,
            senderId: currentUser._id
          });
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setUploading(false);
    }
  };

  // Helper: Get other participant
  const getPartner = (conv) => {
    if (!conv) return {};
    return currentUser.role === "student" ? conv.instructorId : conv.studentId;
  };

  // Helper: check if a user is online
  const isUserOnline = (userId) => {
    return onlineUsersList.includes(userId?.toString());
  };

  // Filter conversations/partners
  const filteredConversations = conversations.filter(conv => {
    const partner = getPartner(conv);
    return partner?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredPartners = partners.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="messages-layout-container">
      {/* Left Sidebar */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2>Messages</h2>
          <button 
            className={`new-chat-toggle-btn ${showNewChatList ? "active" : ""}`}
            onClick={() => {
              setShowNewChatList(!showNewChatList);
              setSearchQuery("");
            }}
          >
            {showNewChatList ? "Back to chats" : "New Chat"}
          </button>
        </div>

        <div className="messages-search-bar">
          <FiSearch size={18} />
          <input 
            type="text" 
            placeholder={showNewChatList ? "Search contacts..." : "Search messages..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="messages-conversation-list-container">
          {showNewChatList ? (
            // Render contacts list for new chats
            <div className="new-chat-partners-list">
              <p className="sidebar-group-title">Authorized Contacts</p>
              {filteredPartners.length === 0 ? (
                <div className="empty-contacts-state">No contacts found. You can only chat with enrolled instructors/students.</div>
              ) : (
                filteredPartners.map(partner => (
                  <div 
                    key={partner._id} 
                    className="partner-list-item"
                    onClick={() => handleStartChatWithPartner(partner)}
                  >
                    <div className="partner-avatar-wrapper">
                      {partner.profileImage || partner.avatar ? (
                        <img src={partner.profileImage || partner.avatar} alt="Avatar" />
                      ) : (
                        <div className="partner-avatar-initials">{partner.name?.charAt(0)}</div>
                      )}
                      {isUserOnline(partner._id) && <span className="online-indicator-dot"></span>}
                    </div>
                    <div className="partner-info">
                      <h4>{partner.name}</h4>
                      <p>{partner.subject ? `Instructor (${partner.subject})` : "Student"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Render recent conversations list
            <div className="recent-conversations-list">
              {filteredConversations.length === 0 ? (
                <div className="empty-chats-state">No active conversations. Start a new chat.</div>
              ) : (
                filteredConversations.map(conv => {
                  const partner = getPartner(conv);
                  const isOnline = isUserOnline(partner?._id);
                  const isActive = activeConversation?._id === conv._id;
                  
                  return (
                    <div 
                      key={conv._id} 
                      className={`conversation-list-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="partner-avatar-wrapper">
                        {partner?.profileImage || partner?.avatar ? (
                          <img src={partner.profileImage || partner.avatar} alt="Avatar" />
                        ) : (
                          <div className="partner-avatar-initials">{partner?.name?.charAt(0) || "U"}</div>
                        )}
                        {isOnline && <span className="online-indicator-dot"></span>}
                      </div>

                      <div className="conv-details-row">
                        <div className="conv-header-row">
                          <h4>{partner?.name || "LMS User"}</h4>
                          <span className="conv-time">
                            {conv.lastMessage 
                              ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              : new Date(conv.updatedAt).toLocaleDateString()
                            }
                          </span>
                        </div>

                        <div className="conv-body-row">
                          <p className="conv-last-msg">
                            {conv.lastMessage?.text || (conv.lastMessage?.fileUrl ? "Shared attachment" : "Start messaging...")}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="conv-unread-badge">{conv.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Window */}
      <div className="messages-window-container">
        {activeConversation ? (
          <div className="active-chat-workspace">
            {/* Header */}
            <div className="chat-workspace-header">
              <div className="header-partner-details">
                <div className="partner-avatar-wrapper">
                  {getPartner(activeConversation).profileImage || getPartner(activeConversation).avatar ? (
                    <img src={getPartner(activeConversation).profileImage || getPartner(activeConversation).avatar} alt="Avatar" />
                  ) : (
                    <div className="partner-avatar-initials">{getPartner(activeConversation).name?.charAt(0)}</div>
                  )}
                  {isUserOnline(getPartner(activeConversation)._id) && <span className="online-indicator-dot"></span>}
                </div>
                <div>
                  <h3>{getPartner(activeConversation).name}</h3>
                  <span className="partner-status-text">
                    {isUserOnline(getPartner(activeConversation)._id) ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <div className="header-action-details" title="Secured LMS communication">
                <FiInfo size={18} />
              </div>
            </div>

            {/* Messages body */}
            <div className="chat-messages-scroller">
              {messages.map((msg, index) => {
                const isMyMessage = msg.sender === currentUser._id;
                
                // Show date separator if message date differs from previous
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showDateSeparator = !prevMsg || 
                  new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                
                return (
                  <React.Fragment key={msg._id || index}>
                    {showDateSeparator && (
                      <div className="chat-date-separator">
                        <span>{new Date(msg.createdAt).toLocaleDateString(undefined, {weekday: 'long', month: 'short', day: 'numeric'})}</span>
                      </div>
                    )}

                    <div className={`message-bubble-wrapper ${isMyMessage ? "outgoing" : "incoming"}`}>
                      <div className="message-bubble">
                        
                        {/* Render attachment */}
                        {msg.fileUrl && (
                          <div className="message-attachment-box">
                            {msg.fileType.startsWith("image/") ? (
                              <div className="message-image-preview">
                                <img src={msg.fileUrl} alt={msg.fileName} />
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="attachment-dl-btn" title="Download Image">
                                  <FiDownload size={14} />
                                </a>
                              </div>
                            ) : (
                              <div className="message-file-doc-pill">
                                <FiFileText size={20} className="file-icon" />
                                <div className="file-details">
                                  <span className="file-name">{msg.fileName}</span>
                                  <span className="file-size">{msg.fileType.split("/")[1]?.toUpperCase() || "File"}</span>
                                </div>
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="file-download-action-btn" title="Download">
                                  <FiDownload size={16} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Render text */}
                        {msg.text && <p className="msg-text-content">{msg.text}</p>}

                        <div className="msg-status-row">
                          <span className="msg-timestamp">
                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          
                          {isMyMessage && (
                            <span className="msg-status-checkmark">
                              {msg.isRead ? (
                                <FiCheck className="read-checks" size={14} />
                              ) : (
                                <FiCheck className="sent-check" size={14} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Typing indicator */}
              {typingUsers[activeConversation._id] && (
                <div className="message-bubble-wrapper incoming">
                  <div className="message-bubble typing-bubble">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview if selected */}
            {selectedFile && (
              <div className="attachment-draft-preview-panel">
                {filePreview === "doc" ? (
                  <div className="draft-file-icon">
                    <FiFileText size={32} />
                    <span>{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="draft-img-container">
                    <img src={filePreview} alt="upload preview" />
                  </div>
                )}
                <button className="remove-draft-btn" onClick={clearFileSelection}>
                  <FiTrash2 size={16} />
                </button>
              </div>
            )}

            {/* Input field */}
            <form onSubmit={handleSendMessage} className="chat-workspace-input-form">
              <div className="attachment-button-wrapper">
                <label htmlFor="chat-file-input">
                  <FiPaperclip size={20} />
                </label>
                <input 
                  id="chat-file-input"
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  accept="image/*,application/pdf"
                />
              </div>

              <input 
                type="text" 
                placeholder="Type a message..." 
                value={inputText}
                onChange={handleInputChange}
                disabled={uploading}
              />

              <button 
                type="submit" 
                className="chat-send-btn" 
                disabled={(!inputText.trim() && !selectedFile) || uploading}
              >
                <FiSend size={18} />
              </button>
            </form>
          </div>
        ) : (
          <div className="empty-workspace-state">
            <div className="empty-illustration">💬</div>
            <h3>Your Messages</h3>
            <p>Send and receive secure, real-time messages with your instructors and students. Select a contact or active conversation to start communicating.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
