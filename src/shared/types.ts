export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  date: string;
  messages: Message[];
  /** ID del modelo (ModelConfig.id) usado en este chat */
  modelId?: string;
}

export interface ConversationMeta {
  id: string;
  title: string;
  date: string;
}

export interface ModelConfig {
  id: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  modelAlias: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface AppConfig {
  activeModelId: string;
  models: ModelConfig[];
  activeSkills?: string[];
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
}

export interface InvokeLLMOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface InvokeLLMResponse {
  ok: boolean;
  status?: number;
  error?: string;
  data?: {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
}

export interface Skill {
  id: string;
  name: string;
  desc: string;
}
