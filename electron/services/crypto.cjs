function registerCryptoHandlers({ ipcMain, safeStorage }) {
  ipcMain.handle('is-encryption-available', async () => safeStorage.isEncryptionAvailable());

  ipcMain.handle('encrypt-data', async (_event, text) => {
    if (!text) return '';
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('ENCRYPTION_UNAVAILABLE');
    }

    try {
      return safeStorage.encryptString(text).toString('base64');
    } catch (err) {
      console.error('Encryption error:', err.message);
      throw new Error('ENCRYPTION_FAILED');
    }
  });

  ipcMain.handle('decrypt-data', async (_event, encryptedBase64) => {
    if (!encryptedBase64) return '';

    if (!safeStorage.isEncryptionAvailable()) {
      return encryptedBase64;
    }

    try {
      return safeStorage.decryptString(Buffer.from(encryptedBase64, 'base64'));
    } catch (err) {
      console.error('Decryption error:', err.message);
      throw new Error('DECRYPTION_FAILED');
    }
  });
}

module.exports = {
  registerCryptoHandlers,
};
