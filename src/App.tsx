import { useState } from 'react';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SkillsManager } from './components/SkillsManager';
import { Settings } from './components/Settings';

function App() {
  const [currentView, setCurrentView] = useState<'chat' | 'settings'>('chat');
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);

  return (
    <div className="app-layout">
      <TopNav currentView={currentView} setCurrentView={setCurrentView} />
      
      <div className="main-content">
        {currentView === 'chat' ? (
          <>
            <Sidebar 
              currentConvId={currentConvId} 
              setCurrentConvId={setCurrentConvId} 
            />
            <ChatArea 
              currentConvId={currentConvId}
              setCurrentConvId={setCurrentConvId}
            />
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
