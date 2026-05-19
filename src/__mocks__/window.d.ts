import type { Conversation, ConversationMeta, InvokeLLMOptions, InvokeLLMResponse, SearchResult } from '../shared/types';

export {};

interface ElectronAPI {
  readDir: (dirPath: string) => Promise<string[]>;
  readFile: (filePath: string) => Promise<string | null>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  deleteFile: (filePath: string) => Promise<boolean>;
  invokeLLM: (url: string, options: InvokeLLMOptions) => Promise<InvokeLLMResponse>;
  performSearch: (query: string) => Promise<SearchResult[]>;
  listConversations: () => Promise<ConversationMeta[]>;
  saveConversation: (conversation: Conversation) => Promise<{ meta: ConversationMeta; index: ConversationMeta[] }>;
  deleteConversation: (id: string) => Promise<boolean>;
  getConversationsIndex: () => Promise<ConversationMeta[]>;
  updateConversationsIndex: (index: ConversationMeta[]) => Promise<boolean>;
  encryptData: (text: string) => Promise<string>;
  decryptData: (encryptedBase64: string) => Promise<string>;
  isEncryptionAvailable: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
