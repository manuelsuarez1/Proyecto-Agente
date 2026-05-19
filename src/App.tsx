import { useState } from 'react';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SkillsManager } from './components/SkillsManager';
import { Settings } from './components/Settings';
import { useChatSession } from './hooks/useChatSession';

function App() {
  const [currentView, setCurrentView] = useState<'chat' | 'settings'>('chat');
  const chat = useChatSession();

  return (
    <div className="app-layout">
      <TopNav currentView={currentView} setCurrentView={setCurrentView} />

      <div className="main-content">
        {currentView === 'chat' ? (
          <>
            <Sidebar chat={chat} />
            <ChatArea chat={chat} />
            <SkillsManager />
          </>
        ) : (
          <Settings />
        )}
      </div>
    </div>
  );
}

export default App;
