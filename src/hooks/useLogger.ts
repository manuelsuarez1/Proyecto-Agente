import { logger, type LogLevel } from '../services/loggingService';

export function useLogger() {
  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      logger.debug(message, context);
    },
    info: (message: string, context?: Record<string, unknown>) => {
      logger.info(message, context);
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      logger.warn(message, context);
    },
    error: (message: string, error?: Error, context?: Record<string, unknown>) => {
      logger.error(message, error, context);
    },
    log: (level: LogLevel, message: string, error?: Error, context?: Record<string, unknown>) => {
      switch (level) {
        case 'debug':
          logger.debug(message, context);
          break;
        case 'info':
          logger.info(message, context);
          break;
        case 'warn':
          logger.warn(message, context);
          break;
        case 'error':
          logger.error(message, error, context);
          break;
      }
    }
  };
}
