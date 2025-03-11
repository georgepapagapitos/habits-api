/**
 * Logger utility for habits-api.
 * Provides a consistent interface for logging with different severity levels.
 * In production, debug and info logs can be optionally suppressed.
 */

// Determine environment
const isProduction = process.env.NODE_ENV === "production";

/**
 * Format the log message with a timestamp and optional metadata
 */
const formatMessage = (
  level: string,
  message: string,
  meta?: unknown
): string => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

/**
 * Logger interface with severity levels
 */
export const logger = {
  /**
   * Log debug message - only in development
   */
  debug(message: string, meta?: unknown): void {
    if (!isProduction) {
      console.debug(formatMessage("debug", message, meta));
    }
  },

  /**
   * Log info message - only in development by default
   */
  info(message: string, meta?: unknown): void {
    if (!isProduction || process.env.LOG_LEVEL === "info") {
      console.info(formatMessage("info", message, meta));
    }
  },

  /**
   * Log warning message - shown in all environments
   */
  warn(message: string, meta?: unknown): void {
    console.warn(formatMessage("warn", message, meta));
  },

  /**
   * Log error message - shown in all environments
   */
  error(message: string, meta?: unknown): void {
    console.error(formatMessage("error", message, meta));
  },
};
