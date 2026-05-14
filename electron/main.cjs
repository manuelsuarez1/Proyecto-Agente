const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // En desarrollo cargamos localhost:5173 (Vite), en producción el archivo compilado
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

app.on('ready', createWindow);

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

// IPC Handlers para manejo de archivos
ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const fullPath = path.join(app.getPath('userData'), dirPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    const files = fs.readdirSync(fullPath);
    return files;
  } catch (err) {
    console.error('Error reading dir:', err);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const fullPath = path.join(app.getPath('userData'), filePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf8');
  } catch (err) {
    console.error('Error reading file:', err);
    return null;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    const fullPath = path.join(app.getPath('userData'), filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing file:', err);
    return false;
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    const fullPath = path.join(app.getPath('userData'), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return true;
  } catch (err) {
    console.error('Error deleting file:', err);
    return false;
  }
});
