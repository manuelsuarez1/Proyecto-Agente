import { jest } from '@jest/globals';

const mockElectronAPI = {
  readDir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  deleteFile: jest.fn(),
  invokeLLM: jest.fn(),
  performSearch: jest.fn(),
  listConversations: jest.fn(),
  saveConversation: jest.fn(),
  deleteConversation: jest.fn(),
  getConversationsIndex: jest.fn(),
  updateConversationsIndex: jest.fn(),
  encryptData: jest.fn(),
  decryptData: jest.fn(),
  isEncryptionAvailable: jest.fn(),
};

export default mockElectronAPI;
