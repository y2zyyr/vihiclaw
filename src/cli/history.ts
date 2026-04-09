/**
 * Command History / 命令歷史
 * Phase 2 Round 15 - Command history for REPL / REPL 命令歷史
 */

import { existsSync, readFileSync, appendFileSync } from 'fs';

export interface HistoryEntry {
  command: string;
  timestamp: number;
  sessionId?: string;
}

export class CommandHistory {
  private history: string[] = [];
  private position = -1;
  private historyPath: string;
  private maxSize: number;

  constructor(historyPath: string, maxSize = 1000) {
    this.historyPath = historyPath;
    this.maxSize = maxSize;
    this.load();
  }

  private load(): void {
    if (existsSync(this.historyPath)) {
      const content = readFileSync(this.historyPath, 'utf-8');
      this.history = content
        .split('\n')
        .filter(line => line.trim())
        .slice(-this.maxSize);
    }
  }

  add(command: string): void {
    if (!command.trim()) return;

    // Don't add duplicates at the end / 不在末尾添加重複
    if (this.history[this.history.length - 1] === command) {
      return;
    }

    this.history.push(command);

    // Keep within max size / 保持在最大大小內
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(-this.maxSize);
    }

    // Persist to file / 持久化到文件
    try {
      appendFileSync(this.historyPath, command + '\n', 'utf-8');
    } catch {
      // Ignore write errors / 忽略寫入錯誤
    }

    this.position = this.history.length;
  }

  previous(): string | null {
    if (this.position > 0) {
      this.position--;
      return this.history[this.position];
    }
    return null;
  }

  next(): string | null {
    if (this.position < this.history.length - 1) {
      this.position++;
      return this.history[this.position];
    }
    this.position = this.history.length;
    return null;
  }

  resetPosition(): void {
    this.position = this.history.length;
  }

  search(prefix: string): string[] {
    return this.history
      .filter(cmd => cmd.toLowerCase().startsWith(prefix.toLowerCase()))
      .slice(-10);
  }

  getAll(): string[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
    this.position = 0;
  }
}
