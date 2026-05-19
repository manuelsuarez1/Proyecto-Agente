const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { MAX_FILE_BYTES, assertMaxBytes } = require('./limits.cjs');

function safeUserDataPath(app, relativePath) {
  const userData = path.resolve(app.getPath('userData'));
  const resolved = path.resolve(userData, relativePath);
  const relative = path.relative(userData, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Acceso denegado: path no permitido -> ${relativePath}`);
  }

  return resolved;
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

function registerStorageHandlers({ app, ipcMain }) {
  ipcMain.handle('read-dir', async (_event, dirPath) => {
    try {
      const fullPath = safeUserDataPath(app, dirPath);
      await ensureDir(fullPath);
      return await fsp.readdir(fullPath);
    } catch (err) {
      console.error('Error reading dir:', err.message);
      return [];
    }
  });

  ipcMain.handle('read-file', async (_event, filePath) => {
    try {
      const fullPath = safeUserDataPath(app, filePath);
      return await fsp.readFile(fullPath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      console.error('Error reading file:', err.message);
      return null;
    }
  });

  ipcMain.handle('write-file', async (_event, filePath, content) => {
    try {
      assertMaxBytes(content, MAX_FILE_BYTES, 'Archivo');
      const fullPath = safeUserDataPath(app, filePath);
      await ensureDir(path.dirname(fullPath));
      await fsp.writeFile(fullPath, content, 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing file:', err.message);
      return false;
    }
  });

  ipcMain.handle('delete-file', async (_event, filePath) => {
    try {
      const fullPath = safeUserDataPath(app, filePath);
      await fsp.unlink(fullPath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return true;
      console.error('Error deleting file:', err.message);
      return false;
    }
  });
}

module.exports = {
  ensureDir,
  registerStorageHandlers,
  safeUserDataPath,
};
