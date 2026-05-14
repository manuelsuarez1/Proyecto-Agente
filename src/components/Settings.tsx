import React, { useState, useEffect } from 'react';
import { Save, RefreshCcw, Cpu, Key, Zap, Brain, Scale, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import './Settings.css';

export interface ModelConfig {
  id: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  modelAlias: string;
  temperature: number;
  maxTokens: number;
}

export interface AppConfig {
  activeModelId: string;
  models: ModelConfig[];
  globalMode: string;
}

const DEFAULT_MODEL: ModelConfig = {
  id: 'default',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  modelAlias: 'AgentX Assistant',
  temperature: 0.7,
  maxTokens: 1500,
};

const DEFAULT_APP_CONFIG: AppConfig = {
  activeModelId: 'default',
  models: [DEFAULT_MODEL],
  globalMode: 'balanced',
};

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [editingModelId, setEditingModelId] = useState<string>('default');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [testMessage, setTestMessage] = useState<{text: string, type: 'success' | 'error' | 'info' | ''}>({text: '', type: ''});
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const fileContent = await window.electronAPI.readFile('config.json');
        if (fileContent) {
          const parsed = JSON.parse(fileContent);
          if (parsed.models) {
            setConfig({ ...DEFAULT_APP_CONFIG, ...parsed });
            setEditingModelId(parsed.activeModelId || parsed.models[0]?.id || 'default');
          } else {
            // Migrate old config format
            const migratedModel: ModelConfig = {
              id: 'default',
              baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
              apiKey: parsed.apiKey || '',
              modelName: parsed.modelName || 'gpt-4o-mini',
              modelAlias: parsed.modelAlias || 'AgentX Assistant',
              temperature: parsed.temperature ?? 0.7,
              maxTokens: parsed.maxTokens ?? 1500,
            };
            const newConfig: AppConfig = {
              activeModelId: 'default',
              models: [migratedModel],
              globalMode: parsed.globalMode || 'balanced',
            };
            setConfig(newConfig);
            setEditingModelId('default');
          }
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      }
    };
    loadConfig();
  }, []);

  const handleGlobalChange = (key: keyof AppConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleModelChange = (key: keyof ModelConfig, value: string | number) => {
    setConfig(prev => {
      const updatedModels = prev.models.map(m => {
        if (m.id === editingModelId) {
          return { ...m, [key]: value };
        }
        return m;
      });
      return { ...prev, models: updatedModels };
    });
  };

  const handleAddModel = () => {
    const newId = `model-${Date.now()}`;
    const newModel: ModelConfig = {
      ...DEFAULT_MODEL,
      id: newId,
      modelAlias: 'New Model'
    };
    setConfig(prev => ({
      ...prev,
      models: [...prev.models, newModel],
      activeModelId: newId
    }));
    setEditingModelId(newId);
  };

  const handleDeleteModel = (id: string) => {
    if (config.models.length <= 1) {
      alert("You must have at least one model configured.");
      return;
    }
    if (confirm("Are you sure you want to delete this model configuration?")) {
      setConfig(prev => {
        const remainingModels = prev.models.filter(m => m.id !== id);
        const newActiveId = prev.activeModelId === id ? remainingModels[0].id : prev.activeModelId;
        setEditingModelId(newActiveId);
        return {
          ...prev,
          models: remainingModels,
          activeModelId: newActiveId
        };
      });
    }
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
    const editingModel = config.models.find(m => m.id === editingModelId);
    if (!editingModel) return;

    try {
      const baseUrlCleaned = editingModel.baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrlCleaned}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${editingModel.apiKey}`
        },
        body: JSON.stringify({
          model: editingModel.modelName,
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
    if (confirm("Are you sure you want to reset all settings to default?")) {
      setConfig(DEFAULT_APP_CONFIG);
      setEditingModelId('default');
    }
  };

  const currentModel = config.models.find(m => m.id === editingModelId) || DEFAULT_MODEL;

  return (
    <div className="settings-view">
      <div className="settings-container">
        
        <section className="settings-section glass">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu className="section-icon" />
              <h3>AI Models</h3>
            </div>
            <button className="btn btn-ghost" onClick={handleAddModel} style={{ padding: '4px 8px', height: 'auto', minHeight: '30px' }}>
              <Plus size={16} style={{marginRight: '4px'}}/> Add Model
            </button>
          </div>
          <div className="models-list" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px' }}>
            {config.models.map(model => (
              <div 
                key={model.id}
                className={`model-pill ${editingModelId === model.id ? 'active' : ''}`}
                onClick={() => setEditingModelId(model.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '16px',
                  background: editingModelId === model.id ? 'var(--primary-color)' : 'var(--bg-secondary)',
                  color: editingModelId === model.id ? '#fff' : 'var(--text-color)',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {model.modelAlias}
                {config.activeModelId === model.id && (
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '8px' }}>Active</span>
                )}
              </div>
            ))}
          </div>
          
          <div className="form-group" style={{ marginBottom: '24px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--text-color)' }}>Editing: {currentModel.modelAlias}</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => handleGlobalChange('activeModelId', currentModel.id)}
                  disabled={config.activeModelId === currentModel.id}
                  style={{ padding: '4px 12px', minHeight: '32px' }}
                >
                  Set as Active
                </button>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => handleDeleteModel(currentModel.id)}
                  style={{ padding: '4px 12px', minHeight: '32px', color: '#f87171' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Model Alias (Displayed in App)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="E.g., My Personal Assistant" 
                value={currentModel.modelAlias || ''}
                onChange={(e) => handleModelChange('modelAlias', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Base URL</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="https://api.openai.com/v1" 
                value={currentModel.baseUrl}
                onChange={(e) => handleModelChange('baseUrl', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>API Key</label>
              <div className="password-input-wrapper">
                <input 
                  type={showApiKey ? "text" : "password"} 
                  className="input-field" 
                  placeholder="sk-..." 
                  value={currentModel.apiKey}
                  onChange={(e) => handleModelChange('apiKey', e.target.value)}
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Model Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="gpt-4o-mini" 
                value={currentModel.modelName}
                onChange={(e) => handleModelChange('modelName', e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="slider-header">
                <label>Temperature</label>
                <span className="slider-value">{currentModel.temperature}</span>
              </div>
              <input 
                type="range" 
                className="range-slider" 
                min="0" 
                max="2" 
                step="0.1" 
                value={currentModel.temperature}
                onChange={(e) => handleModelChange('temperature', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Max Tokens</label>
              <input 
                type="number" 
                className="input-field" 
                min="100" 
                step="100" 
                value={currentModel.maxTokens}
                onChange={(e) => handleModelChange('maxTokens', parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </section>

        <section className="settings-section glass">
          <div className="section-header">
            <Brain className="section-icon" />
            <h3>Global Preferences</h3>
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
                  onChange={(e) => handleGlobalChange('globalMode', e.target.value)}
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
                  onChange={(e) => handleGlobalChange('globalMode', e.target.value)}
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
                  onChange={(e) => handleGlobalChange('globalMode', e.target.value)}
                />
                <Brain size={24} className="mode-icon thinking" />
                <div className="mode-label">Thinking</div>
                <div className="mode-desc">Deep reasoning</div>
              </label>
            </div>
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
