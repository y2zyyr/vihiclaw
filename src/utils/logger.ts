import { type Logger } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export class FileLogger implements Logger {
  private logFile?: string;
  private consoleLevel: number;

  constructor(
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    logDir?: string
  ) {
    this.consoleLevel = this.levelToNumber(level);

    if (logDir) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFile = path.join(logDir, `claw-${timestamp}.log`);
      this.ensureLogDir(logDir);
    }
  }

  private levelToNumber(level: string): number {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level as keyof typeof levels] ?? 1;
  }

  private async ensureLogDir(logDir: string): Promise<void> {
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  private async writeToFile(level: string, message: string, meta?: Record<string, unknown>): Promise<void> {
    if (!this.logFile) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };

    try {
      await fs.appendFile(this.logFile, JSON.stringify(entry) + '\n');
    } catch {
      // ignore file write errors
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    const levelNum = this.levelToNumber(level);
    if (levelNum >= this.consoleLevel) {
      const colors = {
        debug: '\x1b[90m',
        info: '\x1b[36m',
        warn: '\x1b[33m',
        error: '\x1b[31m'
      };
      const reset = '\x1b[0m';
      console.error(`${colors[level]}[${level.toUpperCase()}]${reset} ${message}`);
    }
    this.writeToFile(level, message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }
}

export function createLogger(level: 'debug' | 'info' | 'warn' | 'error', logDir?: string): Logger {
  return new FileLogger(level, logDir);
}
