import { getActiveModel } from '../../src/services/configService';
import type { AppConfig, ModelConfig } from '../../src/shared/types';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

// Mock de la API de Electron para las pruebas
const mockElectronAPI = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  decryptData: jest.fn(),
  encryptData: jest.fn(),
  isEncryptionAvailable: jest.fn(),
};

// Configurar el mock global antes de las pruebas
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('configService', () => {
  beforeEach(() => {
    // Limpiar los mocks antes de cada prueba
    jest.clearAllMocks();
  });

  describe('getActiveModel', () => {
    it('debería devolver el modelo activo cuando existe', () => {
      const config: AppConfig = {
        activeModelId: 'test-model',
        models: [
          {
            id: 'test-model',
            baseUrl: 'https://api.test.com',
            apiKey: 'test-key',
            modelName: 'Test Model',
            modelAlias: 'Test Model Alias',
            temperature: 0.7,
            maxTokens: 1000,
          } as ModelConfig
        ],
        activeSkills: [] as string[],
      };

      const activeModel = getActiveModel(config);
      
      expect(activeModel).toBeDefined();
      if (activeModel) {
        expect(activeModel.id).toBe('test-model');
      }
    });

    it('debería devolver el primer modelo cuando el modelo activo no existe', () => {
      const config: AppConfig = {
        activeModelId: 'non-existent',
        models: [
          {
            id: 'first-model',
            baseUrl: 'https://api.first.com',
            apiKey: 'first-key',
            modelName: 'First Model',
            modelAlias: 'First Model Alias',
            temperature: 0.5,
            maxTokens: 500,
          },
          {
            id: 'second-model',
            baseUrl: 'https://api.second.com',
            apiKey: 'second-key',
            modelName: 'Second Model',
            modelAlias: 'Second Model Alias',
            temperature: 0.8,
            maxTokens: 1500,
          }
        ] as ModelConfig[],
        activeSkills: [] as string[],
      };

      const activeModel = getActiveModel(config);
      
      expect(activeModel).toBeDefined();
      if (activeModel) {
        expect(activeModel.id).toBe('first-model');
      }
    });

    it('debería devolver undefined cuando no hay modelos', () => {
      const config: AppConfig = {
        activeModelId: 'test-model',
        models: [] as ModelConfig[],
        activeSkills: [] as string[],
      };

      const activeModel = getActiveModel(config);
      
      expect(activeModel).toBeUndefined();
    });
  });
});
