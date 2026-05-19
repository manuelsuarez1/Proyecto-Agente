const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { ensureDir, safeUserDataPath } = require('./storage.cjs');

function sortIndex(index) {
  return [...index].sort((a, b) => b.id.localeCompare(a.id));
}

async function readConversationMeta(conversationsDir, file) {
  try {
    const raw = await fsp.readFile(path.join(conversationsDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      id: parsed.id,
      title: parsed.title || 'Untitled',
      date: parsed.date || '',
    };
  } catch (err) {
    console.error('Error parsing conversation:', file, err.message);
    return null;
  }
}

async function rebuildIndexFromDisk(conversationsDir) {
  const files = await fsp.readdir(conversationsDir);
  const metas = await Promise.all(
    files
      .filter(file => file !== 'index.json' && file.endsWith('.json'))
      .map(file => readConversationMeta(conversationsDir, file)),
  );
  return sortIndex(metas.filter(Boolean));
}

async function readIndexFile(indexPath) {
  try {
    const raw = await fsp.readFile(indexPath, 'utf8');
    const index = JSON.parse(raw);
    return Array.isArray(index) ? index : null;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    console.error('Error reading conversations index:', err.message);
    return null;
  }
}

async function writeIndex(indexPath, index) {
  await fsp.writeFile(indexPath, JSON.stringify(sortIndex(index), null, 2));
}

async function getPaths(app) {
  const conversationsDir = safeUserDataPath(app, 'conversations');
  await ensureDir(conversationsDir);
  const indexPath = safeUserDataPath(app, 'conversations/index.json');
  return { conversationsDir, indexPath };
}

async function listConversations(app) {
  const { conversationsDir, indexPath } = await getPaths(app);
  let index = await readIndexFile(indexPath);
  if (!index) {
    index = await rebuildIndexFromDisk(conversationsDir);
    await writeIndex(indexPath, index);
  }
  return sortIndex(index);
}

function registerConversationHandlers({ app, ipcMain }) {
  ipcMain.handle('list-conversations', async () => {
    try {
      return await listConversations(app);
    } catch (err) {
      console.error('Error in list-conversations:', err.message);
      return [];
    }
  });

  ipcMain.handle('save-conversation', async (_event, conversation) => {
    try {
      const { conversationsDir, indexPath } = await getPaths(app);
      const filePath = path.join(conversationsDir, `${conversation.id}.json`);
      await fsp.writeFile(filePath, JSON.stringify(conversation, null, 2));

      let index = (await readIndexFile(indexPath)) || [];
      const meta = {
        id: conversation.id,
        title: conversation.title || 'Untitled',
        date: conversation.date || '',
      };
      const existing = index.findIndex(item => item.id === meta.id);
      if (existing >= 0) index[existing] = meta;
      else index.unshift(meta);

      index = sortIndex(index);
      await writeIndex(indexPath, index);
      return { meta, index };
    } catch (err) {
      console.error('Error in save-conversation:', err.message);
      throw err;
    }
  });

  ipcMain.handle('delete-conversation', async (_event, id) => {
    try {
      const { conversationsDir, indexPath } = await getPaths(app);
      const filePath = path.join(conversationsDir, `${id}.json`);

      try {
        await fsp.unlink(filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }

      const current = await readIndexFile(indexPath);
      if (current?.some(item => item.id === id)) {
        await writeIndex(indexPath, current.filter(item => item.id !== id));
      }

      return true;
    } catch (err) {
      console.error('Error in delete-conversation:', err.message);
      throw err;
    }
  });

  ipcMain.handle('get-conversations-index', async () => {
    try {
      return await listConversations(app);
    } catch (err) {
      console.error('Error in get-conversations-index:', err.message);
      return [];
    }
  });

  ipcMain.handle('update-conversations-index', async (_event, index) => {
    try {
      const { indexPath } = await getPaths(app);
      await writeIndex(indexPath, index);
      return true;
    } catch (err) {
      console.error('Error updating index:', err.message);
      return false;
    }
  });
}

module.exports = {
  registerConversationHandlers,
};
