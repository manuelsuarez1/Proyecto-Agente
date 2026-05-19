import { DEFAULT_APP_CONFIG } from '../shared/configDefaults';
import type { AppConfig, ModelConfig } from '../shared/types';
import { logger } from './loggingService';

type LegacyConfig = Partial<AppConfig> & Partial<ModelConfig>;
const BROWSER_CONFIG_KEY = 'agentx.config';

interface WindowWithElectron {
  electronAPI?: {
    readFile(filePath: string): Promise<string | null>;
    writeFile(filePath: string, content: string): Promise<boolean>;
    decryptData(encryptedBase64: string): Promise<string>;
    encryptData(text: string): Promise<string>;
    isEncryptionAvailable(): Promise<boolean>;
  };
}

export class ConfigPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigPersistenceError';
  }
}

function looksLikePlainApiKey(value: string): boolean {
  return value.startsWith('sk-') || value.startsWith('Bearer ') || value.length < 80;
}

function normalizeConfig(parsed: LegacyConfig): AppConfig {
  let models = parsed.models;

  if (!models) {
    models = [{
      id: 'default',
      baseUrl: parsed.baseUrl || DEFAULT_APP_CONFIG.models[0].baseUrl,
      apiKey: parsed.apiKey || '',
      modelName: parsed.modelName || DEFAULT_APP_CONFIG.models[0].modelName,
      modelAlias: parsed.modelAlias || DEFAULT_APP_CONFIG.models[0].modelAlias,
      temperature: parsed.temperature ?? DEFAULT_APP_CONFIG.models[0].temperature,
      maxTokens: parsed.maxTokens ?? DEFAULT_APP_CONFIG.models[0].maxTokens,
    }];
  }

  return {
    ...DEFAULT_APP_CONFIG,
    ...parsed,
    models,
    activeModelId: parsed.activeModelId || models[0]?.id || DEFAULT_APP_CONFIG.activeModelId,
    activeSkills: parsed.activeSkills || [],
  };
}

async function decryptConfig(config: AppConfig): Promise<AppConfig> {
  const electronAPI = (window as unknown as WindowWithElectron).electronAPI;
  if (!electronAPI) {
    throw new ConfigPersistenceError('Servicio de cifrado no disponible');
  }
  const models = await Promise.all(config.models.map(async model => {
    if (!model.apiKey) return { ...model, apiKey: '' };

    try {
      const apiKey = await electronAPI.decryptData(model.apiKey);
      return { ...model, apiKey };
    } catch {
      if (looksLikePlainApiKey(model.apiKey)) {
        return { ...model, apiKey: model.apiKey };
      }
      throw new ConfigPersistenceError('No se pudo descifrar la API key guardada. Vuelve a introducirla en Ajustes.');
    }
  }));

  return { ...config, models };
}

async function encryptConfig(config: AppConfig): Promise<AppConfig> {
  const electronAPI = (window as unknown as WindowWithElectron).electronAPI;
  if (!electronAPI) {
    throw new ConfigPersistenceError('Servicio de cifrado no disponible');
  }
  const models = await Promise.all(config.models.map(async model => {
    if (!model.apiKey) return { ...model, apiKey: '' };

    try {
      const apiKey = await electronAPI.encryptData(model.apiKey);
      return { ...model, apiKey };
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'ENCRYPTION_UNAVAILABLE') {
        throw new ConfigPersistenceError(
          'El cifrado del sistema no está disponible. No se guardará la API key en texto claro.',
        );
      }
      throw new ConfigPersistenceError('No se pudo cifrar la API key.');
    }
  }));

  return { ...config, models };
}

export async function loadConfig(): Promise<AppConfig> {
  const electronAPI = (window as unknown as WindowWithElectron).electronAPI;
  if (!electronAPI) {
    logger.debug('Electron API no disponible, usando localStorage');
    const stored = window.localStorage.getItem(BROWSER_CONFIG_KEY);
    return stored ? normalizeConfig(JSON.parse(stored) as LegacyConfig) : DEFAULT_APP_CONFIG;
  }

  try {
    const content = await electronAPI.readFile('config.json');
    if (!content) {
      logger.info('No se encontró archivo de configuración, usando valores por defecto');
      return DEFAULT_APP_CONFIG;
    }

    const parsed = normalizeConfig(JSON.parse(content) as LegacyConfig);
    return await decryptConfig(parsed);
  } catch (err) {
    logger.error('Error cargando configuración', err as Error);
    return DEFAULT_APP_CONFIG;
  }
}

export async function saveConfig(config: AppConfig): Promise<boolean> {
  const electronAPI = (window as unknown as WindowWithElectron).electronAPI;
  if (!electronAPI) {
    try {
      window.localStorage.setItem(BROWSER_CONFIG_KEY, JSON.stringify(config));
      logger.debug('Configuración guardada en localStorage');
      return true;
    } catch (err) {
      logger.error('Error guardando configuración en localStorage', err as Error);
      return false;
    }
  }

  try {
    const encrypted = await encryptConfig(config);
    await electronAPI.writeFile('config.json', JSON.stringify(encrypted, null, 2));
    logger.info('Configuración guardada exitosamente');
    return true;
  } catch (err) {
    if (err instanceof ConfigPersistenceError) {
      logger.error('Error de persistencia de configuración', err);
      throw err;
    }
    logger.error('Error guardando configuración', err as Error);
    return false;
  }
}

export async function isEncryptionAvailable(): Promise<boolean> {
  const electronAPI = (window as unknown as WindowWithElectron).electronAPI;
  if (!electronAPI?.isEncryptionAvailable) {
    logger.debug('API de encriptación no disponible');
    return false;
  }
  logger.info('API de encriptación disponible');
  return electronAPI.isEncryptionAvailable();
}

export function getActiveModel(config: AppConfig): ModelConfig | undefined {
  if (!config.models || config.models.length === 0) {
    return undefined;
  }
  
  const activeModel = config.models.find(model => model.id === config.activeModelId);
  return activeModel || config.models[0];
}

export async function updateActiveSkills(activeSkills: string[]): Promise<boolean> {
  const config = await loadConfig();
  return saveConfig({ ...config, activeSkills });
}
