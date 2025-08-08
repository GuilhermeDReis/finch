/**
 * Logger utility for consistent logging across the application
 * Provides different log levels and structured logging capabilities
 */

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4, // Used to disable logging completely
}

// Current environment
const isProduction = import.meta.env?.PROD || false;

// Default configuration
const defaultConfig = {
  // In production, only show warnings and errors by default
  // In development, show all logs
  minLevel: isProduction ? LogLevel.WARN : LogLevel.DEBUG,
  // Enable console output by default
  enableConsole: true,
  // Add emoji icons to logs for better visibility
  useIcons: true,
  // Add timestamps to logs
  showTimestamps: true,
  // Add module/component name to logs
  showModule: true,
};

// Logger configuration
let config = { ...defaultConfig };

// Icons for different log levels
const icons = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
};

// Module/component cache to avoid creating multiple loggers for the same module
const loggerCache = new Map<string, Logger>();

/**
 * Logger class for consistent logging
 */
export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param data Additional data to log
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param data Additional data to log
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param data Additional data to log
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   * @param message The message or error to log
   * @param data Additional data to log
   */
  error(message: string | Error, data?: any): void {
    if (message instanceof Error) {
      this.log(LogLevel.ERROR, message.message, {
        ...data,
        error: {
          name: message.name,
          stack: message.stack,
          message: message.message,
        },
      });
    } else {
      this.log(LogLevel.ERROR, message, data);
    }
  }

  /**
   * Internal log method
   * @param level The log level
   * @param message The message to log
   * @param data Additional data to log
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Skip if logging is disabled for this level
    if (level < config.minLevel) {
      return;
    }

    // Format the log message
    let formattedMessage = '';

    // Add timestamp if enabled
    if (config.showTimestamps) {
      const timestamp = new Date().toISOString();
      formattedMessage += `[${timestamp}] `;
    }

    // Add icon if enabled
    if (config.useIcons) {
      formattedMessage += `${icons[level]} `;
    }

    // Add log level
    formattedMessage += `[${LogLevel[level]}]`;

    // Add module name if enabled
    if (config.showModule && this.module) {
      formattedMessage += ` [${this.module}]`;
    }

    // Add message
    formattedMessage += ` ${message}`;

    // Log to console if enabled
    if (config.enableConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, data || '');
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data || '');
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, data || '');
          break;
      }
    }

    // Here you could add additional log destinations like:  
    // - Remote logging service
    // - Local storage
    // - File system (in Node.js environments)
  }
}

/**
 * Configure the logger
 * @param newConfig The new configuration
 */
export function configureLogger(newConfig: Partial<typeof config>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get a logger for a specific module
 * @param module The module name
 * @returns A logger instance
 */
export function getLogger(module: string): Logger {
  if (!loggerCache.has(module)) {
    loggerCache.set(module, new Logger(module));
  }
  return loggerCache.get(module)!;
}

/**
 * Reset logger configuration to defaults
 */
export function resetLoggerConfig(): void {
  config = { ...defaultConfig };
}

// Export a default logger for quick access
export default getLogger('App');