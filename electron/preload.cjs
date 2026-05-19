const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  invokeLLM: (url, options) => ipcRenderer.invoke('invoke-llm', url, options),
  performSearch: (query) => ipcRenderer.invoke('perform-search', query),
  listConversations: () => ipcRenderer.invoke('list-conversations'),
  saveConversation: (conversation) => ipcRenderer.invoke('save-conversation', conversation),
  deleteConversation: (id) => ipcRenderer.invoke('delete-conversation', id),
  getConversationsIndex: () => ipcRenderer.invoke('get-conversations-index'),
  updateConversationsIndex: (index) => ipcRenderer.invoke('update-conversations-index', index),
  encryptData: (text) => ipcRenderer.invoke('encrypt-data', text),
  decryptData: (text) => ipcRenderer.invoke('decrypt-data', text),
  isEncryptionAvailable: () => ipcRenderer.invoke('is-encryption-available'),
});
