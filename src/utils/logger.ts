/**
 * Logger utility for Next Read extension
 * All logs are prefixed with [NextRead]
 */

const PREFIX = '[NextRead]';

export const logger = {
  info: (...args: unknown[]): void => {
    console.log(PREFIX, ...args);
  },

  debug: (...args: unknown[]): void => {
    console.debug(PREFIX, '[DEBUG]', ...args);
  },

  warn: (...args: unknown[]): void => {
    console.warn(PREFIX, '[WARN]', ...args);
  },

  error: (...args: unknown[]): void => {
    console.error(PREFIX, '[ERROR]', ...args);
  },
};
