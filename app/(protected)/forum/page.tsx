'use client';
import { useState, useEffect, useRef } from 'react';
import { Send, Users, Search, Plus, MessageSquare, Paperclip, FileText, X, Download, Trash2, Settings, AlertCircle, Mic, Square, Play, Pause, Loader2, PanelLeftClose, PanelLeftOpen, ArrowLeft } from 'lucide-react';
import BookLoader from '@/components/BookLoader';

export default function ForumPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Create Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Settings/Edit Group State
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editSelectedUserIds, setEditSelectedUserIds] = useState<string[]>([]);
  
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false);
  
  // File Upload & Voice State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchGroups();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && activeGroupId) {
        setIsSidebarHidden(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [activeGroupId]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && (showNewGroupModal || showSettingsModal)) {
        fetchUsers();
    }
  }, [showNewGroupModal, showSettingsModal, currentUser]);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
    }
  };

  const fetchProfile = async () => {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      setCurrentUser(data.user);
    }
  };

  const fetchGroups = async () => {
    const res = await fetch('/api/groups');
    if (res.ok) {
      const data = await res.json();
      setGroups(data);
      if (data.length > 0 && !activeGroupId) {
        setActiveGroupId(data[0].id);
      }
    }
    setIsLoading(false);
  };

  const fetchMessages = async (groupId: string) => {
    const res = await fetch(`/api/groups/${groupId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
      // Mark as read when viewing
      markAsRead(groupId);
    }
  };

  const markAsRead = async (groupId: string) => {
    if (currentUser?.role === 'ADMIN') return;
    try {
        await fetch(`/api/groups/${groupId}/read`, { method: 'POST' });
        // Update local groups state to clear the badge
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, unreadCount: 0 } : g));
    } catch (e) {}
  };

  // --- Voice Recording Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_message_${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = () => {}; // Discard the resulting blob
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      audioChunksRef.current = [];
      setMediaRecorder(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Send Logic ---
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!newMsg.trim() && !selectedFile) || !activeGroupId) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('content', newMsg);
    if (selectedFile) {
        formData.append('file', selectedFile);
    }

    try {
        const res = await fetch(`/api/groups/${activeGroupId}/messages`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            setNewMsg('');
            setSelectedFile(null);
            const sent = await res.json();
            setMessages(prev => [sent, ...prev]); // Prepend new message
            fetchGroups(); // Update sidebar order
        } else {
            const data = await res.json();
            setError(data.details || data.error || 'Failed to send message');
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsUploading(false);
    }
  };
  // -------------------------

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, description: newGroupDescription, memberIds: selectedUserIds })
    });

    if (res.ok) {
        setNewGroupName('');
        setNewGroupDescription('');
        setSelectedUserIds([]);
        setShowNewGroupModal(false);
        fetchGroups();
    }
  };

  const updateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupId || !editGroupName.trim()) return;

    const res = await fetch(`/api/groups/${editGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editGroupName, description: editGroupDescription, memberIds: editSelectedUserIds })
    });

    if (res.ok) {
        setShowSettingsModal(false);
        fetchGroups();
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to update group');
    }
  };

  const deleteGroup = async (groupIdToDelete?: any) => {
    const id = typeof groupIdToDelete === 'string' ? groupIdToDelete : editGroupId;
    if (!id || !window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

    const res = await fetch(`/api/groups/${id}`, {
        method: 'DELETE'
    });

    if (res.ok) {
        setShowSettingsModal(false);
        if (activeGroupId === id) {
          setActiveGroupId(null);
        }
        fetchGroups();
    }
  };

  // --- Unsend Logic ---
  const unsendMessage = async (messageId: string) => {
    if (!activeGroupId || !window.confirm('Are you sure you want to unsend this message? Parents/Teachers will no longer see the content.')) return;

    try {
        const res = await fetch(`/api/groups/${activeGroupId}/messages/${messageId}/unsend`, {
            method: 'POST'
        });

        if (res.ok) {
            // Update local state immediately
            setMessages(prev => prev.map(m => 
                m.id === messageId ? { ...m, isDeleted: true, content: 'This message was unsent' } : m
            ));
        } else {
            const data = await res.json();
            setError(data.error || 'Failed to unsend message');
        }
    } catch (err: any) {
        setError(err.message);
    }
  };

  useEffect(() => {
    if (activeGroupId) {
      fetchMessages(activeGroupId);
      const msgInterval = setInterval(() => fetchMessages(activeGroupId), 5000); 
      const groupInterval = setInterval(fetchGroups, 10000); // Also refresh groups for sidebar order
      return () => {
        clearInterval(msgInterval);
        clearInterval(groupInterval);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId]);

  useEffect(() => {
    // We no longer scroll to bottom automatically because newest messages are at the top
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [messages]);

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const openSettingsForGroup = async (group: any) => {
    setEditGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || '');
    setEditSelectedUserIds([]); 
    setUserSearchQuery('');
    setShowSettingsModal(true);
    setShowManageGroupsModal(false);

    try {
      const res = await fetch(`/api/groups/${group.id}`);
      if (res.ok) {
        const data = await res.json();
        setEditSelectedUserIds(data.memberIds || []);
        if (data.description !== undefined) {
          setEditGroupDescription(data.description || '');
        }
      }
    } catch (e) {
      console.error('Error fetching group details:', e);
    }
  };

  // Open settings with current group data
  const openSettings = async () => {
    if (!activeGroup) return;
    await openSettingsForGroup(activeGroup);
  };

  if (isLoading) return <BookLoader text="Connecting to Community..." />;

  return (
    <div className="forum-container animate-fade-in">
      {/* Sidebar */}
      <div className={`chat-sidebar ${isSidebarHidden ? 'hidden' : ''}`}>
        <div className="chat-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isMobile && activeGroupId && (
                <button 
                  className="icon-btn" 
                  onClick={() => setIsSidebarHidden(true)}
                  title="Close Sidebar"
                  style={{ padding: '4px', marginRight: '4px' }}
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '1.25rem', color: 'var(--primary)' }}>Portals</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {currentUser?.role === 'ADMIN' && (
                <>
                  <button 
                    className="btn" 
                    style={{ padding: '0.5rem', borderRadius: '50%', background: 'transparent', color: 'var(--primary)' }} 
                    title="Manage Groups"
                    onClick={() => setShowManageGroupsModal(true)}
                  >
                    <Settings size={20} />
                  </button>
                  <button 
                    className="btn" 
                    style={{ padding: '0.5rem', borderRadius: '50%' }} 
                    title="New Group"
                    onClick={() => {
                      setUserSearchQuery('');
                      setShowNewGroupModal(true);
                    }}
                  >
                    <Plus size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="chat-search">
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                className="input" 
                placeholder="Search groups..." 
                style={{ paddingLeft: '2.5rem', borderRadius: '20px', height: '40px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Modals (New Group & Settings) */}
        {showNewGroupModal && (
          <div className="modal-overlay">
            <div className="card modal-content" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
              <h3>Create New Group</h3>
              <form onSubmit={createGroup}>
                <div className="form-group">
                  <label className="form-label">Group Name</label>
                  <input className="input" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Members</label>
                  <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      className="input" 
                      placeholder="Search by name or class..." 
                      style={{ paddingLeft: '2.25rem', borderRadius: '12px', height: '36px', fontSize: '0.9rem' }}
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="user-selector">
                    {availableUsers.filter(u => 
                      (u.name || u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      (u.className || '').toLowerCase().includes(userSearchQuery.toLowerCase())
                    ).map(user => (
                      <div key={user.id} className={`user-chip ${selectedUserIds.includes(user.id) ? 'selected' : ''}`} onClick={() => {
                        setSelectedUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]);
                      }}>
                        {user.name || user.username}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn">Create</button>
                  <button type="button" className="btn danger" onClick={() => setShowNewGroupModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSettingsModal && (
          <div className="modal-overlay">
            <div className="card modal-content" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Group Settings</h3>
                <button type="button" className="btn danger" onClick={() => deleteGroup()} title="Delete Group">
                   <Trash2 size={18} />
                </button>
              </div>
              <form onSubmit={updateGroup}>
                <div className="form-group">
                  <label className="form-label">Rename Group</label>
                  <input className="input" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={editGroupDescription} onChange={(e) => setEditGroupDescription(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Update Members</label>
                  <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      className="input" 
                      placeholder="Search by name or class..." 
                      style={{ paddingLeft: '2.25rem', borderRadius: '12px', height: '36px', fontSize: '0.9rem' }}
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="user-selector">
                    {availableUsers.filter(u => 
                      (u.name || u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      (u.className || '').toLowerCase().includes(userSearchQuery.toLowerCase())
                    ).map(user => (
                      <div key={user.id} className={`user-chip ${editSelectedUserIds.includes(user.id) ? 'selected' : ''}`} onClick={() => {
                        setEditSelectedUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]);
                      }}>
                        {user.name || user.username}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn">Save Changes</button>
                  <button type="button" className="btn secondary" onClick={() => setShowSettingsModal(false)}>Close</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showManageGroupsModal && (
          <div className="modal-overlay">
            <div className="card modal-content" style={{ width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Manage Groups</h3>
                <button type="button" className="btn" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={() => {
                  setShowManageGroupsModal(false);
                  setUserSearchQuery('');
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedUserIds([]);
                  setShowNewGroupModal(true);
                }} title="Create New Group">
                  <Plus size={18} />
                </button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {groups.map(group => (
                  <div key={group.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{group.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {group.description || 'No description'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--primary)' }} onClick={() => openSettingsForGroup(group)} title="Edit Group">
                        <Settings size={16} />
                      </button>
                      <button type="button" className="btn danger" style={{ padding: '4px 8px', background: 'transparent', color: '#ef4444' }} onClick={() => deleteGroup(group.id)} title="Delete Group">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-actions" style={{ marginTop: 0 }}>
                <button type="button" className="btn secondary" style={{ width: '100%' }} onClick={() => setShowManageGroupsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
        
        <div className="group-list">
          {filteredGroups.map(group => (
            <div 
              key={group.id} 
              className={`group-item ${activeGroupId === group.id ? 'active' : ''} ${group.unreadCount > 0 ? 'has-unread' : ''}`} 
              onClick={() => {
                setActiveGroupId(group.id);
                if (isMobile) {
                  setIsSidebarHidden(true);
                }
              }}
            >
              <div className="group-icon">{group.name.charAt(0)}</div>
              <div className="group-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="group-name">{group.name}</div>
                    {group.unreadCount > 0 && currentUser?.role !== 'ADMIN' && (
                        <div className="unread-badge">{group.unreadCount}</div>
                    )}
                </div>
                <div className="group-last-msg">
                  {group.messages?.[0] ? `${group.messages[0].author.name}: ${group.messages[0].content}` : 'No messages'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="chat-window">
        {activeGroup ? (
          <>
            <div className="chat-header" style={{ backdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.7)', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  className="icon-btn sidebar-toggle" 
                  onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                  title={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
                  style={{ marginRight: '0.25rem', marginLeft: '-0.25rem' }}
                >
                  {isMobile && isSidebarHidden ? (
                    <ArrowLeft size={20} />
                  ) : isSidebarHidden ? (
                    <PanelLeftOpen size={20} />
                  ) : (
                    <PanelLeftClose size={20} />
                  )}
                </button>
                <div className="group-icon" style={{ width: '45px', height: '45px', fontFamily: 'Outfit', borderRadius: '12px' }}>{activeGroup.name.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Outfit', fontSize: '1rem' }}>{activeGroup.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {activeGroup.description ? `${activeGroup.description} • ` : ''}{activeGroup._count?.members || 0} online members
                  </div>
                </div>
              </div>
              {currentUser?.role === 'ADMIN' && (
                <button className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={openSettings}>
                  <Settings size={20} />
                </button>
              )}
            </div>

            <div className="chat-messages" ref={scrollRef}>
              {error && (
                <div style={{ padding: '1rem', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', color: '#c53030' }}>
                  <AlertCircle size={20} />
                  <div>
                    <strong>Action Failed</strong>
                    <div style={{ fontSize: '0.8rem' }}>{error}</div>
                  </div>
                </div>
              )}
              {messages.map((m: any, index: number) => {
                const isMine = m.authorId === currentUser?.id;
                const isVoice = m.attachmentType?.startsWith('audio/');
                const isDeleted = m.isDeleted;
                const isNewest = index === 0;
                
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: '1.5rem' }}>
                    <div className={`msg-bubble ${isMine ? 'msg-sent' : 'msg-received'} ${isDeleted ? 'msg-unsent' : ''} ${isNewest ? 'newest-msg' : ''}`}>
                        {!isMine && <div className="msg-author">{m.author.name || m.author.username}</div>}
                        
                        {isDeleted && currentUser.role === 'ADMIN' && (
                            <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, marginBottom: '4px' }}>[UNSENT BY USER]</div>
                        )}

                        {m.content && <div style={{ 
                            marginBottom: m.attachmentPath ? '0.5rem' : 0,
                            fontStyle: isDeleted && !isMine ? 'italic' : 'normal',
                            opacity: isDeleted ? 0.7 : 1
                        }}>
                            {m.content}
                        </div>}
                        
                        {m.attachmentPath && (
                            <div className="attachment-box">
                                {m.attachmentType?.startsWith('image/') ? (
                                    <img src={m.attachmentPath} alt="attachment" style={{ maxWidth: '100%', borderRadius: '4px' }} />
                                ) : isVoice ? (
                                    <div className="voice-message">
                                        <div className="voice-icon"><Mic size={18} /></div>
                                        <audio controls src={m.attachmentPath} className="audio-player" />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FileText size={20} />
                                        <span style={{ fontSize: '0.9rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {m.attachmentPath.split('_').slice(1).join('_')}
                                        </span>
                                        <a href={m.attachmentPath} download className="download-btn">
                                            <Download size={16} />
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '1rem' }}>
                            <div className="msg-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            {!isDeleted && (isMine || currentUser?.role === 'ADMIN') && (
                                <button className="unsend-btn" onClick={() => unsendMessage(m.id)} title="Unsend message">
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="chat-input-container">
                {selectedFile && !isRecording && (
                    <div className="file-preview-strip">
                        <FileText size={16} />
                        <span style={{ fontSize: '0.8rem', flex: 1 }}>{selectedFile.name} ({(selectedFile.size/1024).toFixed(1)} KB)</span>
                        <X size={16} style={{ cursor: 'pointer' }} onClick={() => setSelectedFile(null)} />
                    </div>
                )}
                
                <form onSubmit={sendMessage} className="chat-input-area">
                  {!isRecording ? (
                    <>
                      <button type="button" className="icon-btn" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        <Paperclip size={20} />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                      />
                      <input 
                        className="chat-input" 
                        placeholder={isUploading ? "Uploading..." : "Type a message"}
                        value={newMsg}
                        onChange={(e) => setNewMsg(e.target.value)}
                        disabled={isUploading}
                      />
                      {newMsg.trim() || selectedFile ? (
                        <button type="submit" className="chat-send-btn" disabled={isUploading}>
                          {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                      ) : (
                        <button type="button" className="icon-btn mic-btn" onClick={startRecording}>
                          <Mic size={20} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="recording-tray">
                      <div className="recording-status">
                        <div className="recording-pulse" />
                        <span>Recording {formatTime(recordingTime)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn danger circle" onClick={cancelRecording}><X size={18} /></button>
                        <button type="button" className="btn success circle" onClick={stopRecording}><Square size={18} /></button>
                      </div>
                    </div>
                  )}
                </form>
            </div>
          </>
        ) : (
          <div className="chat-empty-state">
            <MessageSquare size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
            <h2>Select a group to start messaging</h2>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
            position: absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000;
            display:flex; alignItems:center; justifyContent:center; padding:1rem;
        }
        .user-selector {
            display:flex; flex-wrap:wrap; gap:0.5rem; max-height:150px; overflow-y:auto; padding:0.5rem;
            border:1px solid var(--border-color); border-radius:8px;
        }
        .user-chip {
            padding:4px 12px; border-radius:16px; background:#f0f0f0; cursor:pointer; font-size:0.85rem;
            border:1px solid transparent; transition:all 0.2s;
        }
        .user-chip.selected {
            background:var(--primary); color:white;
        }
        .modal-actions {
            display:flex; gap:1rem; margin-top:2rem;
        }
        .attachment-box {
            background:rgba(0,0,0,0.05); padding:0.75rem; border-radius:6px; margin-top:4px;
        }
        .msg-unsent { opacity: 0.8; }
        .unsend-btn { 
            background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;
            opacity: 0; transition: opacity 0.2s;
        }
        .msg-bubble {
          max-width: 75%;
          padding: 1rem 1.25rem;
          border-radius: 18px;
          position: relative;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          line-height: 1.5;
          font-size: 1rem;
        }
        
        .msg-sent {
          align-self: flex-end;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }
        
        .msg-received {
          align-self: flex-start;
          background-color: var(--card-bg);
          color: var(--text-main);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border-color);
        }
        
        .msg-author {
          font-size: 0.75rem;
          font-weight: 800;
          margin-bottom: 0.35rem;
          color: var(--accent);
          font-family: 'Outfit', sans-serif;
        }
        
        .msg-time {
          font-size: 0.65rem;
          text-align: right;
          margin-top: 0.5rem;
          opacity: 0.7;
          font-weight: 600;
        }
        
        .msg-bubble:hover .unsend-btn { opacity: 1; }
        .unsend-btn:hover { color: #ef4444; }

        .voice-message {
            display:flex; align-items:center; gap:0.75rem; width:100%; min-width:240px;
        }
        .voice-icon {
            width:36px; height:36px; border-radius:50%; background:var(--accent); color:var(--primary);
            display:flex; align-items:center; justify-content:center; flex-shrink: 0;
        }
        .audio-player { height:32px; border-radius:16px; opacity: 0.8; }
        
        .recording-tray {
            flex:1; display:flex; align-items:center; justify-content:space-between; padding:0 1rem;
            background:#f8f9fa; border-radius:25px; height:44px; animation: slideIn 0.2s ease;
        }
        .recording-status { display:flex; align-items:center; gap:10px; color:#ef4444; font-weight:600; }
        .recording-pulse { width:10px; height:10px; background:#ef4444; border-radius:50%; animation: pulse 1s infinite; }
        .circle { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; padding:0; }
        
        .download-btn { color:var(--primary); display:flex; align-items:center; }
        .chat-input-container { border-top: 1px solid var(--border-color); }
        .file-preview-strip { padding: 8px 16px; background:#f8f9fa; display:flex; align-items:center; gap:8px; border-bottom:1px solid #eee; }
        .icon-btn { background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:8px; display:flex; align-items:center; }
        .icon-btn:hover { color:var(--primary); }
        .mic-btn:hover { color:#ef4444; }
        
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .chat-sidebar {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            width: 320px;
            flex-shrink: 0;
            overflow: hidden;
        }
        .chat-sidebar.hidden {
            width: 0;
            opacity: 0;
            pointer-events: none;
        }
        .sidebar-toggle:hover {
            color: var(--primary);
            background: rgba(10, 54, 104, 0.05);
            border-radius: 8px;
        }
        .unread-badge {
            background: #ef4444;
            color: white;
            font-size: 0.7rem;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 10px;
            min-width: 20px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(239, 68, 68, 0.3);
            animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .group-item.has-unread {
            background: rgba(255, 255, 255, 0.9);
            border-left: 4px solid var(--primary);
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
            position: relative;
        }

        .group-item.has-unread::after {
            content: '';
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            width: 8px;
            height: 8px;
            background: #fff;
            border-radius: 50%;
            box-shadow: 0 0 10px #fff, 0 0 20px #fff;
            animation: whitifyPulse 2s infinite;
        }

        @keyframes whitifyPulse {
            0% { opacity: 0.5; box-shadow: 0 0 5px #fff; }
            50% { opacity: 1; box-shadow: 0 0 15px #fff, 0 0 25px #fff; }
            100% { opacity: 0.5; box-shadow: 0 0 5px #fff; }
        }

        .msg-bubble.newest-msg {
            border: 2px solid rgba(255, 255, 255, 0.5);
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        @keyframes badgePop {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 768px) {
          .chat-sidebar {
            width: 100% !important;
            display: flex !important;
          }
          .chat-sidebar.hidden {
            width: 0 !important;
            display: none !important;
          }
          .chat-window {
            display: flex !important;
            width: 100% !important;
          }
          .chat-sidebar:not(.hidden) ~ .chat-window {
            display: none !important;
          }
          .chat-header {
            padding: 0.75rem 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}
