import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:8080/api';
const socket = io('http://localhost:8080');

function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [currentView, setCurrentView] = useState('login');

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');


  const messagesEndRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      socket.emit('join', user._id);

      groups.forEach(group => {
        if (group.members.some(member => member._id === user._id)) {
          socket.emit('joinGroup', group._id);
        }
      });
    }
  }, [user, groups]);

  // setup socket 
  useEffect(() => {
    const handlePrivateMessage = (data) => {
      console.log('Received private message:', data);
      if (
        selectedUser &&
        ((data.message.sender === selectedUser._id && data.message.receiver === user._id) ||
          (data.message.sender === user._id && data.message.receiver === selectedUser._id))
      ) {
        setMessages(prev => [...prev, data.message]);
      }
      fetchUsers();
    };

    const handleGroupMessage = (data) => {
      console.log('Received group message:', data);
      if (selectedGroup && data.groupId === selectedGroup._id) {
        setMessages(prev => [...prev, data.message]);
      }
      fetchGroups();
    };

    const handleGroupCreated = (data) => {
      socket.emit('joinGroup', data.groupId);
      fetchGroups();
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    socket.on('receiveMessage', handlePrivateMessage);
    socket.on('receiveGroupMessage', handleGroupMessage);
    socket.on('groupCreated', handleGroupCreated);
    socket.on('reactionUpdated', handleReactionUpdated);

    return () => {
      socket.off('receiveMessage', handlePrivateMessage);
      socket.off('receiveGroupMessage', handleGroupMessage);
      socket.off('groupCreated', handleGroupCreated);
      socket.off('reactionUpdated', handleReactionUpdated);
    };
  }, [user, selectedUser, selectedGroup]); 


  // login
  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.data);
        localStorage.setItem('token', data.data.accessToken);
        await fetchUsers();
        await fetchGroups();
        setCurrentView('chat');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  // registration
  const handleRegister = async () => {
    if (!firstname || !lastname || !email || !phone || !password) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstname, lastname, email, phone, gender, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registration successful! Please login.');
        setCurrentView('login');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Registration failed: ' + error.message);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
        setUnreadCounts(data.unReadMsg || {});
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };


  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName || selectedGroupMembers.length === 0) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newGroupName, members: selectedGroupMembers })
      });
      const data = await res.json();
      if (res.ok) {
        setGroups(prev => [...prev, data.group]);
        setNewGroupName('');
        setSelectedGroupMembers([]);

        socket.emit('joinGroup', data.group._id);
      }
    } catch (err) {
      console.error('Group creation failed', err);
    }
  };

  const fetchMessages = async (userId) => {
    console.log(`Fetching messages for user ${userId}`);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/messages/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages);
        console.log(messages);

        setUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchGroupMessages = async (groupId) => {
    console.log(`Fetching group messages for group ${groupId}`);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/messages/${groupId}?type=group`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch group messages', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    const token = localStorage.getItem('token');
    const formData = new FormData();

    if (newMessage.trim()) {
      formData.append('content', newMessage.trim());
    }

    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    if (selectedUser) {
      formData.append('receiver', selectedUser._id);
    }

    if (selectedGroup) {
      formData.append('groupId', selectedGroup._id);
    }

    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, data.data]);
        setNewMessage('');
        setSelectedFile(null); 

        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';

        if (selectedGroup) {
          socket.emit('sendGroupMessage', {
            senderId: user._id,
            groupId: selectedGroup._id,
            message: data.data
          });
        } else {
          socket.emit('sendMessage', {
            senderId: user._id,
            receiverId: selectedUser._id,
            message: data.data
          });
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };
  const isImage = (filename) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  //reaction
  const handleReaction = async (messageId, emoji) => {
    console.log(messageId, emoji);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/messages/${messageId}/react`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });

      if (!res.ok) {
        const data = await res.json();
        console.error(data.message);
      }
    } catch (err) {
      console.error("Failed to send reaction:", err.message);
    }
  };


  const selectUser = (selectedUser) => {
    setSelectedGroup(null);
    setSelectedUser(selectedUser);
    console.log(selectedUser);
    fetchMessages(selectedUser._id);
  };

  const selectGroup = (group) => {
    setSelectedUser(null);
    setSelectedGroup(group);
    fetchGroupMessages(group._id);
    socket.emit('joinGroup', group._id);
  };

  const logout = () => {
    setUser(null);
    setUsers([]);
    setSelectedUser(null);
    setSelectedGroup(null);
    setMessages([]);
    setCurrentView('login');
    localStorage.removeItem('token');
    socket.disconnect();
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setCurrentView('chat');
    }
  }, []);

  // login 
  if (currentView === 'login') {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
        <h2>Login</h2>
        <div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <button onClick={handleLogin} style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
            Login
          </button>
        </div>
        <button onClick={() => setCurrentView('register')} style={{ width: '100%', padding: '10px' }}>
          Go to Register
        </button>
      </div>
    );
  }

  // Reg
  if (currentView === 'register') {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
        <h2>Register</h2>
        <div>
          <input
            type="text"
            placeholder="First Name"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
          />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="preferred not to say">Preferred not to say</option>
          </select>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
          <button onClick={handleRegister} style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
            Register
          </button>
        </div>
        <button onClick={() => setCurrentView('login')} style={{ width: '100%', padding: '10px' }}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '300px', borderRight: '1px solid #ccc', padding: '10px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>Chat</h3>
          <button onClick={logout} style={{ padding: '5px 10px' }}>Logout</button>
        </div>

        {user && (
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#c1ecbeff' }}>
            <strong>
              {user.firstname.charAt(0).toUpperCase() + user.firstname.slice(1)}{' '}
              {user.lastname.charAt(0).toUpperCase() + user.lastname.slice(1)}
            </strong>
            <br />
            <small>{user.email}</small>
          </div>
        )}

        {/* group create */}
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h4>Create Group</h4>
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            style={{ width: '100%', padding: '5px', marginBottom: '10px' }}
          />
          <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
            {users.map(u => (
              <label key={u._id} style={{ display: 'block', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  checked={selectedGroupMembers.includes(u._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedGroupMembers(prev => [...prev, u._id]);
                    } else {
                      setSelectedGroupMembers(prev => prev.filter(id => id !== u._id));
                    }
                  }}
                />
                {' '}{u.firstname} {u.lastname}
              </label>
            ))}
          </div>
          <button onClick={handleCreateGroup} style={{ marginTop: '10px', padding: '5px 10px' }}>
            Create
          </button>
        </div>

        <h4>Users</h4>
        <div>
          {users.map((u) => (
            <div
              key={u._id}
              onClick={() => selectUser(u)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                marginBottom: '5px',
                cursor: 'pointer',
                backgroundColor: selectedUser?._id === u._id ? '#e3f2fd' : 'white',
                position: 'relative'
              }}
            >
              <strong>{u.firstname} {u.lastname}</strong>
              <br />
              <small>{u.email}</small>

              {unreadCounts[u._id] > 0 && (
                <span style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  backgroundColor: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  {unreadCounts[u._id]}
                </span>
              )}
            </div>
          ))}
        </div>

        <h4>Your Groups</h4>
        <div>
          {groups.map(group => (
            <div
              key={group._id}
              onClick={() => selectGroup(group)}
              style={{
                cursor: 'pointer',
                marginBottom: '10px',
                padding: '10px',
                border: '1px solid #ddd',
                backgroundColor: selectedGroup?._id === group._id ? '#e3f2fd' : 'white'
              }}
            >
              <strong>{group.name}</strong> <br />
              <small>Admin: {group.admin.firstname} {group.admin.lastname}</small>
              <div style={{ marginTop: '4px', fontSize: '0.9em' }}>
                Members: {group.members.map(member => `${member.firstname} ${member.lastname}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {(selectedUser || selectedGroup) ? (
          <>
            <div style={{ padding: '15px', borderBottom: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
              <h4>
                {selectedUser
                  ? `${selectedUser.firstname} ${selectedUser.lastname}`
                  : selectedGroup?.name
                }
              </h4>
            </div>

             {/* messages area  */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '10px',
                    padding: '8px',
                    borderRadius: '5px',
                    maxWidth: '70%',
                    backgroundColor:
                      msg.sender === user?._id || msg.sender?._id === user?._id
                        ? '#dcf8c6'
                        : '#f1f1f1',
                    marginLeft:
                      msg.sender === user?._id || msg.sender?._id === user?._id
                        ? 'auto'
                        : '0',
                    marginRight:
                      msg.sender === user?._id || msg.sender?._id === user?._id
                        ? '0'
                        : 'auto'
                  }}
                >
                 
                  {selectedGroup && msg.sender?._id !== user?._id && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '3px',
                        fontWeight: 'bold'
                      }}
                    >
                      {msg.sender?.firstname} {msg.sender?.lastname}
                    </div>
                  )}

                 
                  {msg.content && <div>{msg.content}</div>}

                  {/* file show and onclick open in div */}
                  {isImage(msg.file) && (
                    <div style={{ marginTop: '5px' }}>
                      {msg.fileType?.startsWith('image/') ? (
                        <img
                          src={msg.file}
                          alt="attachment"
                          style={{
                            maxWidth: '200px',
                            maxHeight: '200px',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPreviewFile(msg.file)}
                        />
                      ) : (
                        <div
                          onClick={() => setPreviewFile(msg.file)}
                          style={{
                            color: '#007bff',
                            textDecoration: 'underline',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          📎 {msg.file || 'Download file'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* given reaction  */}
                  {msg.reactions?.length > 0 && (
                    <div style={{ marginTop: '5px', fontSize: '14px' }}>
                      {msg.reactions.map((reaction, i) => (
                        <span key={i} style={{ marginRight: '8px' }}>
                          {reaction.emoji} {reaction.user?.firstname}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>

                  {/* reaction*/}
                  <div style={{ marginTop: '5px', display: 'flex', gap: '2px', backgroundColor: "#efe8e8ff", borderRadius: "6px", alignSelf: 'flex-end' }}>
                    {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg._id, emoji)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />

              {/* preview file but image breaking */}
              {previewFile && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    zIndex: 9999
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      backgroundColor: '#fff',
                      padding: '20px',
                      borderRadius: '10px',
                      maxWidth: '90%',
                      maxHeight: '90%',
                      overflow: 'auto'
                    }}
                  >
                    <button
                      onClick={() => setPreviewFile(null)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '15px',
                        fontSize: '18px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#000'
                      }}
                    >
                      ✕
                    </button>
                    <img
                      src={previewFile}
                      alt="preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        display: 'block',
                        margin: '0 auto'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>


            <div style={{ padding: '10px', borderTop: '1px solid #ccc' }}>

              {selectedFile && (
                <div style={{
                  marginBottom: '10px',
                  padding: '8px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>📎 {selectedFile.name}</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'red',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div style={{ display: 'flex' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '8px', marginRight: '10px' }}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{ marginRight: '10px' }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: '8px 15px',
                    opacity: (!newMessage.trim() && !selectedFile) ? 0.5 : 1
                  }}
                  disabled={!newMessage.trim() && !selectedFile}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h3>Select a user or group to start chatting</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;