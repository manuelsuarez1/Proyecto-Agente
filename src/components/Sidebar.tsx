import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, MessageSquareText } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  currentConvId: string | null;
  setCurrentConvId: (id: string | null) => void;
}

export interface ConversationMeta {
  id: string;
  title: string;
  mode: string;
  date: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentConvId, setCurrentConvId }) => {
  const [history, setHistory] = useState<ConversationMeta[]>([]);

  const loadHistory = async () => {
    try {
      const files = await window.electronAPI.readDir('conversations');
      const convs: ConversationMeta[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await window.electronAPI.readFile(`conversations/${file}`);
          if (content) {
            try {
              const parsed = JSON.parse(content);
              convs.push({
                id: parsed.id,
                title: parsed.title || 'Untitled',
                mode: parsed.mode || 'balanced',
                date: parsed.date || ''
              });
            } catch(e) {
              console.error("Invalid json in", file);
            }
          }
        }
      }
      // Sort by descending ID assuming ID is timestamp
      convs.sort((a, b) => b.id.localeCompare(a.id));
      setHistory(convs);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  useEffect(() => {
    loadHistory();
    
    // Set up a custom event listener to reload history when a chat is saved
    const handleHistoryUpdate = () => loadHistory();
    window.addEventListener('history-updated', handleHistoryUpdate);
    return () => window.removeEventListener('history-updated', handleHistoryUpdate);
  }, []);

  const handleNewChat = () => {
    setCurrentConvId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      await window.electronAPI.deleteFile(`conversations/${id}.json`);
      if (currentConvId === id) {
        setCurrentConvId(null);
      }
      loadHistory();
    }
  };

  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <button className="btn btn-primary new-chat-btn" onClick={handleNewChat}>
          <PlusCircle size={18} /> New Chat
        </button>
      </div>
      <div className="history-subtitle">Recent Conversations</div>
      <div className="history-list">
        {history.length === 0 && (
           <div style={{opacity: 0.5, textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem'}}>
             No recent conversations
           </div>
        )}
        {history.map(conv => (
          <div 
            key={conv.id} 
            className={`history-item ${currentConvId === conv.id ? 'active' : ''}`}
            onClick={() => setCurrentConvId(conv.id)}
          >
            <div className="history-item-content">
              <MessageSquareText size={16} className="history-icon" />
              <div className="history-info">
                <span className="history-title">{conv.title}</span>
                <div className="history-meta">
                  <span className="date">{conv.date}</span>
                  <span className={`badge badge-${conv.mode}`}>{conv.mode}</span>
                </div>
              </div>
            </div>
            <button className="delete-btn" title="Delete conversation" onClick={(e) => handleDelete(e, conv.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
};
