import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquareText, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import type { useChatSession } from '../hooks/useChatSession';
import './Sidebar.css';

type ChatSession = ReturnType<typeof useChatSession>;

interface SidebarProps {
  chat: ChatSession;
}

export const Sidebar: React.FC<SidebarProps> = ({ chat }) => {
  const {
    history,
    activeId,
    isConversationReplyPending,
    startNewChat,
    selectChat,
    removeChat,
    renameChat,
  } = chat;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleDeleteClick = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setConfirmDeleteId(null);
    removeChat(id);
  };

  const cancelDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setConfirmDeleteId(null);
  };

  const saveEditTitle = async (id: string) => {
    const newTitle = editTitle.trim();
    setEditingId(null);
    if (!newTitle) return;
    await renameChat(id, newTitle);
  };

  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <button
          type="button"
          className="btn btn-primary new-chat-btn"
          onClick={startNewChat}
        >
          <PlusCircle size={18} /> New Chat
        </button>
      </div>

      <div className="history-subtitle">Recent Conversations</div>

      <div className="history-list">
        {history.length === 0 && (
          <p className="history-empty">No recent conversations</p>
        )}

        {history.map(conv => (
          <div
            key={conv.id}
            role="button"
            tabIndex={0}
            className={`history-item ${activeId === conv.id ? 'active' : ''} ${isConversationReplyPending(conv.id) ? 'replying' : ''} ${confirmDeleteId === conv.id ? 'confirm-delete' : ''}`}
            onClick={() => {
              if (confirmDeleteId === conv.id) return;
              void selectChat(conv.id);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (confirmDeleteId === conv.id) return;
                void selectChat(conv.id);
              }
            }}
          >
            <div className="history-item-content">
              <MessageSquareText size={16} className="history-icon" />
              <div className="history-info">
                {editingId === conv.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="edit-title-input"
                    value={editTitle}
                    onChange={event => setEditTitle(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') void saveEditTitle(conv.id);
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => void saveEditTitle(conv.id)}
                    onClick={event => event.stopPropagation()}
                  />
                ) : (
                  <span className="history-title">{conv.title}</span>
                )}
                <div className="history-meta">
                  <span className="date">{conv.date}</span>
                </div>
              </div>
            </div>

            <div className="history-actions">
              {confirmDeleteId === conv.id ? (
                <div className="delete-confirm" onClick={event => event.stopPropagation()}>
                  <span className="delete-confirm-label">¿Eliminar?</span>
                  <button
                    type="button"
                    className="delete-confirm-yes"
                    onClick={event => confirmDelete(event, conv.id)}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className="delete-confirm-no"
                    onClick={cancelDelete}
                  >
                    No
                  </button>
                </div>
              ) : isConversationReplyPending(conv.id) ? (
                <span className="history-busy" aria-label="Esperando respuesta">
                  <Loader2 size={14} className="spin" />
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    className="edit-btn"
                    title="Edit title"
                    onClick={event => {
                      event.stopPropagation();
                      setConfirmDeleteId(null);
                      setEditingId(conv.id);
                      setEditTitle(conv.title);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    title="Delete conversation"
                    onClick={event => handleDeleteClick(event, conv.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
