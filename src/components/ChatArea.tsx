import React, { memo, useEffect, useRef, useState } from 'react';
import { Bot, Search, Send, Sparkles, User, Globe } from 'lucide-react';
import {
  buildSearchContext,
  requestAssistantReply,
} from '../services/llmService';
import { loadConfig } from '../services/configService';
import type { useChatSession } from '../hooks/useChatSession';
import type { AppConfig, Message } from '../shared/types';
import { MarkdownMessage } from './MarkdownMessage';
import { ThoughtBlock } from './ThoughtBlock';
import './ChatArea.css';

type ChatSession = ReturnType<typeof useChatSession>;

interface ChatAreaProps {
  chat: ChatSession;
}

type ReplyStatus = 'idle' | 'searching' | 'thinking';

interface MessageListProps {
  messages: Message[];
  replyStatus: ReplyStatus;
  isLoadingChat: boolean;
  showReplyPending: boolean;
}

const MessageList = memo(function MessageList({
  messages,
  replyStatus,
  isLoadingChat,
  showReplyPending,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.filter(message => message.role !== 'system');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, replyStatus, isLoadingChat, showReplyPending]);

  if (isLoadingChat) {
    return (
      <div className="messages-container">
        <div className="empty-state">
          <LoaderPlaceholder />
        </div>
      </div>
    );
  }

  if (visibleMessages.length === 0) {
    return (
      <div className="messages-container">
        <div className="empty-state">
          <Sparkles size={48} className="empty-icon" />
          <h3>How can I help you today?</h3>
          <p>Type below to start a new conversation.</p>
        </div>
        <div ref={endRef} />
      </div>
    );
  }

  return (
    <div className="messages-container">
      {visibleMessages.map((message, index) => (
        <div
          key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
          className={`message-wrapper ${message.role}`}
        >
          {message.role === 'assistant' && <div className="avatar"><Bot size={20} /></div>}
          <div
            className={`message-content ${message.role === 'assistant' ? 'glass' : 'user-bubble'}`}
            style={{ whiteSpace: message.role === 'assistant' ? 'normal' : 'pre-wrap' }}
          >
            {message.role === 'assistant' ? (() => {
              const content = message.content;
              const thinkRegex = /<think>([\s\S]*?)<\/think>|<thought>([\s\S]*?)<\/thought>/i;
              const match = content.match(thinkRegex);
              
              if (match) {
                const thought = (match[1] || match[2] || '').trim();
                const response = content.replace(thinkRegex, '').trim();
                return <ThoughtBlock thought={thought} response={response} />;
              }

              return <MarkdownMessage content={content} />;
            })() : (
              message.content
            )}
          </div>
          {message.role === 'user' && <div className="avatar"><User size={20} /></div>}
        </div>
      ))}

      {replyStatus === 'searching' && (
        <div className="message-wrapper assistant">
          <div className="avatar"><Bot size={20} /></div>
          <div className="message-content glass status-indicator">
            <Search size={16} /> Buscando información en tiempo real...
          </div>
        </div>
      )}

      {(replyStatus === 'thinking' || (showReplyPending && replyStatus !== 'searching')) && (
        <div className="message-wrapper assistant">
          <div className="avatar"><Bot size={20} /></div>
          <div className="message-content glass typing-indicator">
            <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
});

function LoaderPlaceholder() {
  return <p className="loading-chat">Cargando conversación...</p>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ chat }) => {
  const {
    activeId,
    messages,
    isLoadingChat,
    isReplyPending,
    isNewChat,
    activeModelId,
    setChatModelId,
    chatError,
    sendUserMessage,
    setChatError,
  } = chat;

  const [input, setInput] = useState('');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [replyStatus, setReplyStatus] = useState<ReplyStatus>('idle');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncConfig() {
      try {
        const nextConfig = await loadConfig();
        if (!cancelled) setConfig(nextConfig);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading config:', err);
          setChatError('No se pudo cargar la configuración.');
        }
      }
    }

    void syncConfig();
    const onUpdate = () => { void syncConfig(); };
    window.addEventListener('config-updated', onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('config-updated', onUpdate);
    };
  }, [setChatError]);

  const [prevActiveId, setPrevActiveId] = useState(activeId);
  if (activeId !== prevActiveId) {
    setPrevActiveId(activeId);
    setReplyStatus('idle');
  }

  const selectedModelId = config?.models.some(item => item.id === activeModelId)
    ? activeModelId
    : (config?.models[0]?.id ?? activeModelId);

  const handleSend = async () => {
    if (!input.trim() || isReplyPending || isLoadingChat) return;
    if (!config) {
      setChatError('Configuración no cargada.');
      return;
    }

    const content = input.trim();
    setInput('');
    setReplyStatus('idle');

    await sendUserMessage(content, async (userMessages) => {
      const lastMessage = userMessages[userMessages.length - 1];
      let searchContext: Message | null = null;

      if (lastMessage?.role === 'user' && webSearchEnabled) {
        setReplyStatus('searching');
        if (window.electronAPI) {
          const results = await window.electronAPI.performSearch(lastMessage.content);
          searchContext = buildSearchContext(results);
        } else {
          searchContext = {
            role: 'system',
            content: 'La búsqueda web no está disponible en la vista de navegador.',
          };
        }
      }

      setReplyStatus('thinking');
      const replyConfig = { ...config, activeModelId: selectedModelId };
      return requestAssistantReply(replyConfig, userMessages, searchContext);
    });
  };

  const handleModelChange = (modelId: string) => {
    setChatModelId(modelId);
  };

  const activeAlias = config?.models.find(item => item.id === selectedModelId)?.modelAlias || 'AI Assistant';
  const canSend = Boolean(input.trim()) && !isReplyPending && !isLoadingChat;

  return (
    <main className="chat-area">
      <div className="chat-header glass">
        <div className="chat-title-group">
          {isNewChat && <span className="new-chat-badge">NEW</span>}
          {config?.models.length ? (
            <select
              className="input-field model-select"
              value={selectedModelId}
              onChange={event => handleModelChange(event.target.value)}
            >
              {config.models.map(model => (
                <option key={model.id} value={model.id}>{model.modelAlias || model.modelName}</option>
              ))}
            </select>
          ) : (
            <h2>{activeAlias}</h2>
          )}
        </div>
      </div>

      {chatError && <div className="chat-error">{chatError}</div>}
      <MessageList
        messages={messages}
        replyStatus={replyStatus}
        isLoadingChat={isLoadingChat}
        showReplyPending={isReplyPending}
      />

      <div className="input-area glass">
        <div className="input-wrapper">
          <button
            type="button"
            className={`search-toggle-btn ${webSearchEnabled ? 'active' : ''}`}
            onClick={() => setWebSearchEnabled(prev => !prev)}
            title={webSearchEnabled ? 'Búsqueda web activada' : 'Activar búsqueda web'}
            disabled={isReplyPending || isLoadingChat}
          >
            <Globe size={18} />
          </button>
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Escribe un mensaje... (Shift + Enter para salto de línea)"
            rows={1}
            disabled={isReplyPending || isLoadingChat}
            style={{ maxHeight: '200px', overflowY: 'auto' }}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary send-btn"
            onClick={() => void handleSend()}
            disabled={!canSend}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
};
