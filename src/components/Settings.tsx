import React, { useState, useEffect } from 'react';
import { Save, RefreshCcw, Cpu, Key, Zap, Brain, Scale, Eye, EyeOff } from 'lucide-react';
import './Settings.css';

interface Config {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  modelAlias: string;
  globalMode: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: Config = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  modelAlias: 'AgentX Assistant',
  globalMode: 'balanced',
  temperature: 0.7,
  maxTokens: 1500,
};

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [testMessage, setTestMessage] = useState<{text: string, type: 'success' | 'error' | 'info' | ''}>({text: '', type: ''});
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const fileContent = await window.electronAPI.readFile('config.json');
        if (fileContent) {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(fileContent) });
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      }
    };
    loadConfig();
  }, []);

  const handleChange = (key: keyof Config, value: string | number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const success = await window.electronAPI.writeFile('config.json', JSON.stringify(config, null, 2));
      if (success) {
        setSaveMessage('Settings saved successfully!');
        window.dispatchEvent(new Event('config-updated'));
      } else {
        setSaveMessage('Failed to save settings.');
      }
    } catch {
      setSaveMessage('Error saving settings.');
    }
    setIsSaving(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleTestConnection = async () => {
    setTestMessage({ text: 'Testing connection...', type: 'info' });
    try {
      const baseUrlCleaned = config.baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrlCleaned}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 1
        })
      });

      if (response.ok) {
        setTestMessage({ text: 'Connection successful!', type: 'success' });
      } else {
        const errText = await response.text();
        setTestMessage({ text: `Failed: ${response.status} - ${errText.substring(0, 50)}`, type: 'error' });
      }
    } catch (err: any) {
      setTestMessage({ text: `Error: ${err.message}`, type: 'error' });
    }
    setTimeout(() => setTestMessage({text: '', type: ''}), 5000);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default settings?")) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  return (
    <div className="settings-view">
      <div className="settings-container">
        
        <section className="settings-section glass">
          <div className="section-header">
            <Key className="section-icon" />
            <h3>API Connection</h3>
          </div>
          <div className="form-group">
            <label>Base URL</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="https://api.openai.com/v1" 
              value={config.baseUrl}
              onChange={(e) => handleChange('baseUrl', e.target.value)}
            />
            <span className="form-hint">Endpoint compatible with OpenAI API format (e.g., Groq, Ollama)</span>
          </div>
          <div className="form-group">
            <label>API Key</label>
            <div className="password-input-wrapper">
              <input 
                type={showApiKey ? "text" : "password"} 
                className="input-field" 
                placeholder="sk-..." 
                value={config.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span className="form-hint">Stored locally. Never sent to third-party servers.</span>
          </div>
        </section>

        <section className="settings-section glass">
          <div className="section-header">
            <Cpu className="section-icon" />
            <h3>Model Configuration</h3>
          </div>
          
          <div className="form-group">
            <label>Model Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="gpt-4o-mini" 
              value={config.modelName}
              onChange={(e) => handleChange('modelName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Model Alias (Displayed in App)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="E.g., My Personal Assistant" 
              value={config.modelAlias || ''}
              onChange={(e) => handleChange('modelAlias', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Default Response Mode</label>
            <div className="mode-cards">
              <label className={`mode-card ${config.globalMode === 'fast' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="global_mode" 
                  value="fast" 
                  checked={config.globalMode === 'fast'}
                  onChange={(e) => handleChange('globalMode', e.target.value)}
                />
                <Zap size={24} className="mode-icon fast" />
                <div className="mode-label">Fast</div>
                <div className="mode-desc">Concise and direct</div>
              </label>
              <label className={`mode-card ${config.globalMode === 'balanced' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="global_mode" 
                  value="balanced" 
                  checked={config.globalMode === 'balanced'}
                  onChange={(e) => handleChange('globalMode', e.target.value)}
                />
                <Scale size={24} className="mode-icon balanced" />
                <div className="mode-label">Balanced</div>
                <div className="mode-desc">Well-rounded answers</div>
              </label>
              <label className={`mode-card ${config.globalMode === 'thinking' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="global_mode" 
                  value="thinking" 
                  checked={config.globalMode === 'thinking'}
                  onChange={(e) => handleChange('globalMode', e.target.value)}
                />
                <Brain size={24} className="mode-icon thinking" />
                <div className="mode-label">Thinking</div>
                <div className="mode-desc">Deep reasoning</div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <div className="slider-header">
              <label>Temperature</label>
              <span className="slider-value">{config.temperature}</span>
            </div>
            <input 
              type="range" 
              className="range-slider" 
              min="0" 
              max="2" 
              step="0.1" 
              value={config.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Max Tokens</label>
            <input 
              type="number" 
              className="input-field" 
              min="100" 
              step="100" 
              value={config.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value, 10))}
            />
          </div>
        </section>

        <div className="settings-actions">
          {saveMessage && <span className="save-message" style={{marginRight: '1rem', color: '#4ade80'}}>{saveMessage}</span>}
          {testMessage.text && (
            <span className={`save-message ${testMessage.type}`} style={{marginRight: '1rem', color: testMessage.type === 'error' ? '#f87171' : testMessage.type === 'success' ? '#4ade80' : '#94a3b8'}}>
              {testMessage.text}
            </span>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button className="btn btn-ghost" onClick={handleTestConnection}>
            <Zap size={18} /> Test Connection
          </button>
          <button className="btn btn-ghost" onClick={handleReset}>
            <RefreshCcw size={18} /> Reset Defaults
          </button>
        </div>

      </div>
    </div>
  );
};
