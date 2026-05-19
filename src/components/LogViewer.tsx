import { useState, useEffect } from 'react';
import { logger, type LogEntry } from '../services/loggingService';
import { Download, Trash2 } from 'lucide-react';

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogViewer({ isOpen, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'debug' | 'info' | 'warn' | 'error'>('all');

  const updateLogs = () => {
    setLogs(logger.getLogs());
  };

  useEffect(() => {
    if (isOpen) {
      const handle = setTimeout(() => {
        updateLogs();
      }, 0);
      return () => clearTimeout(handle);
    }
  }, [isOpen]);

  const handleSaveLogs = async () => {
    const success = await logger.saveLogsToFile();
    if (success) {
      alert('Logs guardados exitosamente');
    } else {
      alert('Error al guardar los logs');
    }
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    updateLogs();
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const formatTimestamp = (date: Date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <h3>Registro de Logs</h3>
        <div className="log-viewer-controls">
          <button onClick={handleSaveLogs} title="Guardar logs">
            <Download size={16} />
          </button>
          <button onClick={handleClearLogs} title="Limpiar logs">
            <Trash2 size={16} />
          </button>
          <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'debug' | 'info' | 'warn' | 'error')}>
            <option value="all">Todos</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
        </select>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
      
      <div className="log-entries">
        {filteredLogs.map((log, index) => (
          <div key={index} className={`log-entry log-entry-${log.level}`}>
            <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
            <span className="log-level">{log.level.toUpperCase()}</span>
            <span className="log-message">{log.message}</span>
            {log.context && (
              <pre className="log-context">
                Contexto: {JSON.stringify(log.context, null, 2)}
              </pre>
            )}
            {log.error && (
              <pre className="log-error">
                Error: {log.error.message}
                {log.error.stack && (
                  <span className="log-stack">{log.error.stack}</span>
                )}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogViewer;
