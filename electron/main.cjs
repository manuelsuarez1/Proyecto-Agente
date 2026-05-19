const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;
const { registerStorageHandlers } = require('./services/storage.cjs');
const { registerConversationHandlers } = require('./services/conversations.cjs');
const { registerCryptoHandlers } = require('./services/crypto.cjs');
const { registerLLMHandlers } = require('./services/llm.cjs');
const { registerSearchHandlers } = require('./services/search.cjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  const context = { app, ipcMain, safeStorage };

  registerStorageHandlers(context);
  registerConversationHandlers(context);
  registerCryptoHandlers(context);
  registerLLMHandlers(context);
  registerSearchHandlers(context);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
