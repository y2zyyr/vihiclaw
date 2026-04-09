/**
 * Log Rotation / 日誌輪轉
 * Phase 2 Round 18 - Rotate log files to prevent growth / 輪轉日誌文件以防止無限增長
 */

import { existsSync, renameSync, unlinkSync, statSync } from 'fs';

export interface LogRotationOptions {
  maxSize: number;        // Max file size in bytes before rotation
  maxFiles: number;       // Max number of rotated files to keep
  maxAge?: number;        // Max age in days (optional)
}

export class LogRotator {
  private options: LogRotationOptions;

  constructor(options: LogRotationOptions) {
    this.options = options;
  }

  /**
   * Rotate log file if needed / 如需要則輪轉日誌文件
   */
  rotate(logPath: string): void {
    if (!existsSync(logPath)) {
      return;
    }

    const stats = statSync(logPath);

    if (stats.size >= this.options.maxSize) {
      this.performRotation(logPath);
    }
  }

  private performRotation(logPath: string): void {
    // Delete oldest file / 刪除最舊的文件
    const oldestPath = `${logPath}.${this.options.maxFiles}`;
    if (existsSync(oldestPath)) {
      try {
        unlinkSync(oldestPath);
      } catch {
        // Ignore delete errors
      }
    }

    // Shift existing files / 移動現有文件
    for (let i = this.options.maxFiles - 1; i >= 1; i--) {
      const oldPath = `${logPath}.${i}`;
      const newPath = `${logPath}.${i + 1}`;

      if (existsSync(oldPath)) {
        try {
          renameSync(oldPath, newPath);
        } catch {
          // Ignore rename errors
        }
      }
    }

    // Rename current file / 重命名當前文件
    try {
      renameSync(logPath, `${logPath}.1`);
    } catch {
      // Ignore rename errors
    }
  }

  /**
   * Clean old log files / 清理舊日誌文件
   */
  cleanup(_logDir: string): void {
    if (!this.options.maxAge) {
      return;
    }


    // This would need fs.readdirSync to implement fully
    // Placeholder for the concept
  }
}
