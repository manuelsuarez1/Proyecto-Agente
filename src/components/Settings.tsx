import React, { useEffect, useState } from 'react';
import { Cpu, Eye, EyeOff, Plus, RefreshCcw, Save, Trash2, Zap } from 'lucide-react';
import { ConfigPersistenceError, isEncryptionAvailable, loadConfig, saveConfig } from '../services/configService';
import { testModelConnection } from '../services/llmService';
import { DEFAULT_APP_CONFIG, DEFAULT_MODEL } from '../shared/configDefaults';
import type { AppConfig, ModelConfig } from '../shared/types';
import './Settings.css';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [editingModelId, setEditingModelId] = useState<string>('default');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [testMessage, setTestMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | '' }>({ text: '', type: '' });
  const [showApiKey, setShowApiKey] = useState(false);
  const [encryptionAvailable, setEncryptionAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function syncConfig() {
      try {
        const [nextConfig, canEncrypt] = await Promise.all([
          loadConfig(),
          isEncryptionAvailable(),
        ]);
        if (cancelled) return;
        setConfig(nextConfig);
        setEncryptionAvailable(canEncrypt);
        setEditingModelId(nextConfig.activeModelId || nextConfig.models[0]?.id || 'default');
      } catch (err) {
        console.error('Failed to load config:', err);
        if (!cancelled && err instanceof ConfigPersistenceError) {
          setSaveMessage(err.message);
        }
      }
    }

    void syncConfig();
    return () => { cancelled = true; };
  }, []);

  const handleGlobalChange = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleModelChange = (key: keyof ModelConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      models: prev.models.map(model => model.id === editingModelId ? { ...model, [key]: value } : model),
    }));
  };

  const handleAddModel = () => {
    const newId = `model-${Date.now()}`;
    const newModel: ModelConfig = {
      ...DEFAULT_MODEL,
      id: newId,
      modelAlias: 'New Model',
    };
    setConfig(prev => ({
      ...prev,
      models: [...prev.models, newModel],
      activeModelId: newId,
    }));
    setEditingModelId(newId);
  };

  const handleDeleteModel = (id: string) => {
    if (config.models.length <= 1) {
      alert('You must have at least one model configured.');
      return;
    }

    if (!confirm('Are you sure you want to delete this model configuration?')) return;

    setConfig(prev => {
      const remainingModels = prev.models.filter(model => model.id !== id);
      const newActiveId = prev.activeModelId === id ? remainingModels[0].id : prev.activeModelId;
      setEditingModelId(newActiveId);
      return {
        ...prev,
        models: remainingModels,
        activeModelId: newActiveId,
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const success = await saveConfig(config);
      if (success) {
        setSaveMessage('Configuración guardada de forma segura.');
        window.dispatchEvent(new Event('config-updated'));
      } else {
        setSaveMessage('Error al guardar la configuración.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setSaveMessage(
        err instanceof ConfigPersistenceError
          ? err.message
          : 'Error al procesar la configuración.',
      );
    } finally {
      setIsSaving(false);
      window.setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleTestConnection = async () => {
    if (isTesting) return;

    setIsTesting(true);
    setTestMessage({ text: 'Testing connection...', type: 'info' });
    const editingModel = config.models.find(model => model.id === editingModelId);
    if (!editingModel) {
      setIsTesting(false);
      return;
    }

    try {
      const response = await testModelConnection(editingModel);

      if (response.ok) {
        setTestMessage({ text: 'Connection successful!', type: 'success' });
      } else {
        const detail = String(response.error || 'Connection failed').replace(/\s+/g, ' ').substring(0, 160);
        setTestMessage({ text: `Failed${response.status ? ` ${response.status}` : ''}: ${detail}`, type: 'error' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTestMessage({ text: `Error: ${message}`, type: 'error' });
    } finally {
      setIsTesting(false);
    }

    window.setTimeout(() => setTestMessage({ text: '', type: '' }), 5000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setConfig(DEFAULT_APP_CONFIG);
      setEditingModelId('default');
    }
  };

  const currentModel = config.models.find(model => model.id === editingModelId) || DEFAULT_MODEL;

  return (
    <div className="settings-view">
      <div className="settings-container">
        {!encryptionAvailable && window.electronAPI && (
          <p className="settings-warning glass">
            El cifrado del sistema operativo no está disponible. Las API keys no se guardarán hasta que esté activo.
          </p>
        )}

        <section className="settings-section glass">
          <div className="section-header settings-section-header">
            <div className="section-title">
              <Cpu className="section-icon" />
              <h3>AI Models</h3>
            </div>
            <button className="btn btn-ghost compact-btn" onClick={handleAddModel}>
              <Plus size={16} /> Add Model
            </button>
          </div>

          <div className="models-list">
            {config.models.map(model => (
              <button
                key={model.id}
                type="button"
                className={`model-pill ${editingModelId === model.id ? 'active' : ''}`}
                onClick={() => setEditingModelId(model.id)}
              >
                {model.modelAlias}
                {config.activeModelId === model.id && <span>Active</span>}
              </button>
            ))}
          </div>

          <div className="model-editor">
            <div className="model-editor-header">
              <h4>Editing: {currentModel.modelAlias}</h4>
              <div className="model-actions">
                <button
                  className="btn btn-ghost compact-btn"
                  onClick={() => handleGlobalChange('activeModelId', currentModel.id)}
                  disabled={config.activeModelId === currentModel.id}
                >
                  Set as Active
                </button>
                <button className="btn btn-ghost compact-btn danger-btn" onClick={() => handleDeleteModel(currentModel.id)}>
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
                onChange={event => handleModelChange('modelAlias', event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Base URL</label>
              <input
                type="text"
                className="input-field"
                placeholder="https://api.openai.com/v1"
                value={currentModel.baseUrl}
                onChange={event => handleModelChange('baseUrl', event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>API Key</label>
              <div className="password-input-wrapper">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="input-field"
                  placeholder="sk-..."
                  value={currentModel.apiKey}
                  onChange={event => handleModelChange('apiKey', event.target.value)}
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowApiKey(!showApiKey)}>
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
                onChange={event => handleModelChange('modelName', event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Instrucción del Sistema (System Prompt)</label>
              <textarea
                className="input-field textarea-field"
                rows={3}
                placeholder="Eres un asistente de IA útil, inteligente y creativo. Responde siempre en español con claridad, proporcionando ejemplos cuando sea necesario."
                value={currentModel.systemPrompt || ''}
                onChange={event => handleModelChange('systemPrompt', event.target.value)}
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
                onChange={event => handleModelChange('temperature', Number.parseFloat(event.target.value))}
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
                onChange={event => handleModelChange('maxTokens', Number.parseInt(event.target.value, 10))}
              />
            </div>
          </div>
        </section>

        <section className="settings-section glass">
          <div className="section-header">
            <h3>Búsqueda web</h3>
          </div>

          <p className="settings-hint">
            La búsqueda web usa Google Noticias para actualidad y DuckDuckGo para consultas generales (documentación, definiciones, guías).
          </p>
        </section>

        <div className="settings-actions">
          {saveMessage && <span className="save-message success">{saveMessage}</span>}
          {testMessage.text && <span className={`save-message ${testMessage.type}`}>{testMessage.text}</span>}
          <button className="btn btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button className="btn btn-ghost" onClick={() => void handleTestConnection()} disabled={isTesting}>
            <Zap size={18} /> {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button className="btn btn-ghost" onClick={handleReset}>
            <RefreshCcw size={18} /> Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

