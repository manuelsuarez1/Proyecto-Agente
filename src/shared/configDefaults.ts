import type { AppConfig, ModelConfig } from './types';

export const DEFAULT_MODEL: ModelConfig = {
  id: 'default',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  modelAlias: 'AgentX Assistant',
  temperature: 0.7,
  maxTokens: 1500,
  systemPrompt: 'Eres un asistente de IA útil, inteligente y creativo. Responde siempre en español con claridad, proporcionando ejemplos cuando sea necesario.',
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  activeModelId: 'default',
  models: [DEFAULT_MODEL],
  activeSkills: [],
};
