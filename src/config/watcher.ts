/**
 * Config Hot Reload / 配置熱重載
 * Phase 2 Round 11 - Hot reload configuration changes / 配置更改熱重載
 */

import { watch, FSWatcher } from 'fs';
import { ClawConfig } from '../types/index.js';

export interface ConfigWatcherOptions {
  configPath: string;
  onChange: (config: ClawConfig) => void;
  debounceMs?: number;
}

export class ConfigWatcher {
  private watcher?: FSWatcher;
  private options: ConfigWatcherOptions;
  private debounceTimer?: NodeJS.Timeout;
  private loadConfig: () => Promise<ClawConfig>;

  constructor(
    options: ConfigWatcherOptions,
    loadConfigFn: () => Promise<ClawConfig>
  ) {
    this.options = options;
    this.loadConfig = loadConfigFn;
  }

  start(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = watch(
      this.options.configPath,
      { persistent: false },
      (eventType) => {
        if (eventType === 'change') {
          this.handleChange();
        }
      }
    );
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  private handleChange(): void {
    const debounceMs = this.options.debounceMs || 500;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        const newConfig = await this.loadConfig();
        this.options.onChange(newConfig);
      } catch (error) {
        // Silently ignore reload errors / 静默忽略重載錯誤
      }
    }, debounceMs);
  }
}
