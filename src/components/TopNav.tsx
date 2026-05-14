import React from 'react';
import { MessageSquare, Settings } from 'lucide-react';
import './TopNav.css';

interface TopNavProps {
  currentView: 'chat' | 'settings';
  setCurrentView: (view: 'chat' | 'settings') => void;
}

export const TopNav: React.FC<TopNavProps> = ({ currentView, setCurrentView }) => {
  return (
    <nav className="top-nav glass">
      <div className="nav-brand">Agent<span className="brand-highlight">X</span></div>
      <div className="nav-links">
        <button 
          className={`nav-btn ${currentView === 'chat' ? 'active' : ''}`}
          onClick={() => setCurrentView('chat')}
        >
          <MessageSquare size={18} /> Chat
        </button>
        <button 
          className={`nav-btn ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
        >
          <Settings size={18} /> Settings
        </button>
      </div>
    </nav>
  );
};
