const { assertAllowedLLMUrl } = require('./urlPolicy.cjs');
const { MAX_LLM_BODY_BYTES, assertMaxBytes } = require('./limits.cjs');
const fs = require('fs');
const path = require('path');

// Configuración básica de logging
let logFilePath = path.join(__dirname, '../../logs/llm.log');


function logToFile(level, message, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
  
  // En entorno de desarrollo, también imprimir en consola
  if (process.env.NODE_ENV === 'development') {
    console.log(logEntry);
  }
  
  // Guardar en archivo de log
  try {
    fs.appendFileSync(logFilePath, logEntry);
    if (error) {
      fs.appendFileSync(logFilePath, `Error: ${error.stack}\n`);
    }
  } catch (err) {
    console.error('Error escribiendo en archivo de log:', err);
  }
}

function pickSafeHeaders(headers = {}) {
  const allowedHeaders = ['content-type', 'authorization', 'accept'];
  const safeHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    if (allowedHeaders.includes(key.toLowerCase())) {
      safeHeaders[key] = value;
    }
  }

  return safeHeaders;
}

function registerLLMHandlers({ app, ipcMain }) {
  if (app) {
    try {
      const userData = app.getPath('userData');
      const logDir = path.join(userData, 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      logFilePath = path.join(logDir, 'llm.log');
    } catch (err) {
      console.error('Error al configurar ruta de log de LLM:', err);
    }
  }

  ipcMain.handle('invoke-llm', async (_event, url, options = {}) => {
    try {
      assertAllowedLLMUrl(url);
      assertMaxBytes(options.body, MAX_LLM_BODY_BYTES, 'Cuerpo de la petición');
      
      logToFile('info', `Invocando LLM en URL: ${url}`);

      const response = await fetch(url, {
        method: options.method || 'POST',
        headers: pickSafeHeaders(options.headers),
        body: options.body,
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logToFile('warn', `Respuesta no exitosa del LLM: ${response.status} - ${errorText}`);
        return { ok: false, status: response.status, error: errorText };
      }

      const data = await response.json();
      logToFile('info', 'Respuesta exitosa del LLM recibida');
      return { ok: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      logToFile('error', 'Error en invocación de LLM', err);
      return { ok: false, status: 500, error: message };
    }
  });
}

module.exports = {
  registerLLMHandlers,
};
