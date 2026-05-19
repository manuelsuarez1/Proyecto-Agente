export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export class Logger {
  private minLevel: LogLevel = 'info';
  private logBuffer: LogEntry[] = [];
  private bufferSize: number = 1000;

  constructor(minLevel?: LogLevel) {
    if (minLevel) {
      this.minLevel = minLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error
    };

    // Añadir al buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift();
    }

    // Imprimir en consola
    this.writeToConsole(entry);
  }

  private writeToConsole(entry: LogEntry): void {
    const formatted = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`;
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
      default:
        console.log(formatted);
    }

    if (entry.context) {
      console.log('Context:', entry.context);
    }

    if (entry.error) {
      console.error(entry.error);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  // Métodos para guardar logs en archivo (solo en Electron)
  async saveLogsToFile(): Promise<boolean> {
    if (window.electronAPI) {
      try {
        const content = this.logBuffer
          .map(entry => `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`)
          .join('\n');
        
        // En un entorno Electron, podríamos guardar esto en un archivo
        // Por ahora solo lo simulamos
        console.log('Logs to save:', content);
        return true;
      } catch (err) {
        console.error('Error saving logs to file:', err);
        return false;
      }
    }
    return false;
  }

  getLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  clearLogs(): void {
    this.logBuffer = [];
  }
}

// Instancia global del logger
export const logger = new Logger();
