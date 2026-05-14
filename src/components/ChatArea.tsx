import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import './ChatArea.css';

interface ChatAreaProps {
  currentConvId: string | null;
  setCurrentConvId: (id: string | null) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  mode: string;
  date: string;
  messages: Message[];
}

export const ChatArea: React.FC<ChatAreaProps> = ({ currentConvId, setCurrentConvId }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState('balanced');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentConvId) {
      loadConversation(currentConvId);
    } else {
      setMessages([]);
    }
  }, [currentConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (id: string) => {
    try {
      const content = await window.electronAPI.readFile(`conversations/${id}.json`);
      if (content) {
        const conv: Conversation = JSON.parse(content);
        setMessages(conv.messages || []);
        setMode(conv.mode || 'balanced');
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
    }
  };

  const saveConversation = async (id: string, msgs: Message[], currentMode: string) => {
    try {
      const title = msgs.length > 0 ? msgs[0].content.substring(0, 30) + '...' : 'New Conversation';
      const conv: Conversation = {
        id,
        title,
        mode: currentMode,
        date: new Date().toLocaleDateString(),
        messages: msgs
      };
      await window.electronAPI.writeFile(`conversations/${id}.json`, JSON.stringify(conv, null, 2));
      window.dispatchEvent(new Event('history-updated'));
    } catch (err) {
      console.error("Error saving conversation:", err);
    }
  };

  const fetchLLMResponse = async (userMessages: Message[]) => {
    try {
      const configStr = await window.electronAPI.readFile('config.json');
      const config = configStr ? JSON.parse(configStr) : null;
      
      if (!config || !config.apiKey) {
        throw new Error("API Key not configured. Please check Settings.");
      }

      // Read active skills content
      let systemContent = "You are a helpful AI assistant.";
      try {
        const files = await window.electronAPI.readDir('skills');
        // Currently we just include all skills as context, we can optimize this later
        const skillsContent = [];
        for (const f of files) {
          if (f.endsWith('.md') || f.endsWith('.txt')) {
             const skillText = await window.electronAPI.readFile(`skills/${f}`);
             if (skillText) skillsContent.push(skillText);
          }
        }
        if (skillsContent.length > 0) {
          systemContent += "\n\nFollow these specific instructions (Skills):\n" + skillsContent.join('\n\n---\n\n');
        }
      } catch (err) {
        console.error("Failed to load skills context", err);
      }

      const apiMessages = [
        { role: 'system', content: systemContent },
        ...userMessages
      ];

      const baseUrlCleaned = config.baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrlCleaned}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.modelName || 'gpt-4o-mini',
          messages: apiMessages,
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1500
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error(error);
      return `Error: ${error.message}`;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let convId = currentConvId;
    if (!convId) {
      convId = Date.now().toString();
      setCurrentConvId(convId);
    }

    await saveConversation(convId, newMessages, mode);

    const assistantText = await fetchLLMResponse(newMessages);
    const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: assistantText }];
    setMessages(finalMessages);
    
    await saveConversation(convId, finalMessages, mode);
    setIsLoading(false);
  };

  return (
    <main className="chat-area">
      <div className="chat-header glass">
        <div className="chat-title-group">
          <h2>{currentConvId ? 'Conversation Details' : 'New Conversation'}</h2>
          <p className="chat-subtitle">AI Assistant Ready</p>
        </div>
        
        <div className="mode-selector">
          <label>Mode:</label>
          <select className="input-field" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="fast">⚡ Fast</option>
            <option value="balanced">⚖️ Balanced</option>
            <option value="thinking">🤔 Thinking</option>
          </select>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={48} className="empty-icon" />
            <h3>How can I help you today?</h3>
            <p>Type below to start a new conversation.</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.role}`}>
              {msg.role === 'assistant' && <div className="avatar"><Bot size={20} /></div>}
              <div className={`message-content ${msg.role === 'assistant' ? 'glass' : 'user-bubble'}`} style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
              {msg.role === 'user' && <div className="avatar"><User size={20} /></div>}
            </div>
          ))
        )}
        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="avatar"><Bot size={20} /></div>
            <div className="message-content glass typing-indicator" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area glass">
        <div className="input-wrapper">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message... (Shift + Enter for new line)"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            className="btn btn-primary send-btn" 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
};
