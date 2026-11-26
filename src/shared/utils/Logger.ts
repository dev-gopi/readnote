// Centralized logging utility
export type LogLevel = 0 | 1 | 2 | 3;

export class Logger {
  static readonly LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const;
  static currentLevel: LogLevel = Logger.LEVELS.DEBUG;
  static readonly prefix = '[ReadNote]';

  static debug(msg: string, ...args: unknown[]): void {
    if (this.currentLevel <= this.LEVELS.DEBUG) {
      console.debug(`${this.prefix} [DEBUG]`, msg, ...args);
    }
  }

  static info(msg: string, ...args: unknown[]): void {
    if (this.currentLevel <= this.LEVELS.INFO) {
      console.info(`${this.prefix} [INFO]`, msg, ...args);
    }
  }

  static warn(msg: string, ...args: unknown[]): void {
    if (this.currentLevel <= this.LEVELS.WARN) {
      console.warn(`${this.prefix} [WARN]`, msg, ...args);
    }
  }

  static error(msg: string, ...args: unknown[]): void {
    if (this.currentLevel <= this.LEVELS.ERROR) {
      console.error(`${this.prefix} [ERROR]`, msg, ...args);
    }
  }

  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
}
