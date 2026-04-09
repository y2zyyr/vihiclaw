/**
 * Memory Store / 記憶存儲
 * Layer 1: Facts - Raw memory item storage / 事實層：原始記憶項存儲
 */

import { MemoryItem, MemorySearchOptions, MemorySearchResult } from './types.js';
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export class MemoryStore {
  private memoryDir: string;
  private index: Map<string, MemoryItem> = new Map();

  constructor(memoryDir: string) {
    this.memoryDir = memoryDir;
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.memoryDir)) {
      mkdirSync(this.memoryDir, { recursive: true });
    }
    await this.loadIndex();
  }

  private getIndexPath(): string {
    return join(this.memoryDir, 'index.jsonl');
  }

  private async loadIndex(): Promise<void> {
    const indexPath = this.getIndexPath();
    if (!existsSync(indexPath)) {
      return;
    }

    const content = readFileSync(indexPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const item: MemoryItem = JSON.parse(line);
        this.index.set(item.id, item);
      } catch {
        // Skip invalid lines
      }
    }
  }

  private async saveToIndex(item: MemoryItem): Promise<void> {
    const indexPath = this.getIndexPath();
    const line = JSON.stringify(item) + '\n';
    appendFileSync(indexPath, line, 'utf-8');
  }

  private computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  async add(item: Omit<MemoryItem, 'id' | 'hash'>): Promise<MemoryItem> {
    const id = `mem-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const hash = this.computeHash(item.contentRaw);

    const memoryItem: MemoryItem = {
      ...item,
      id,
      hash,
    };

    this.index.set(id, memoryItem);
    await this.saveToIndex(memoryItem);

    return memoryItem;
  }

  async get(id: string): Promise<MemoryItem | null> {
    return this.index.get(id) || null;
  }

  async search(options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    for (const item of this.index.values()) {
      let score = 0;
      let matched = false;

      // Session filter / 會話過濾
      if (options.sessionId && item.sessionId !== options.sessionId) {
        continue;
      }

      // Keyword matching (basic BM25-like) / 關鍵詞匹配
      if (options.query) {
        const queryLower = options.query.toLowerCase();
        const contentLower = item.contentRaw.toLowerCase();
        if (contentLower.includes(queryLower)) {
          score += 1.0;
          matched = true;
        }
      } else {
        matched = true;
      }

      // Source type filter / 來源類型過濾
      if (options.sourceTypes && options.sourceTypes.length > 0) {
        if (!options.sourceTypes.includes(item.sourceType)) {
          continue;
        }
      }

      // Project filter / 項目過濾
      if (options.projects && options.projects.length > 0) {
        if (!item.project || !options.projects.includes(item.project)) {
          continue;
        }
      }

      // Topic filter / 主題過濾
      if (options.topics && options.topics.length > 0) {
        if (!item.topic || !options.topics.includes(item.topic)) {
          continue;
        }
      }

      // Entity filter / 實體過濾
      if (options.entities && options.entities.length > 0) {
        const hasEntity = options.entities.some(e =>
          item.entityRefs?.includes(e)
        );
        if (!hasEntity) {
          continue;
        }
      }

      // Time range filter / 時間範圍過濾
      if (options.timeRange) {
        const itemTime = new Date(item.timestamp).getTime();
        const fromTime = new Date(options.timeRange.from).getTime();
        const toTime = new Date(options.timeRange.to).getTime();
        if (itemTime < fromTime || itemTime > toTime) {
          continue;
        }
      }

      if (matched) {
        results.push({
          item,
          score,
          matchType: options.query ? 'keyword' : 'metadata',
        });
      }
    }

    // Sort by score desc / 按分數降序
    results.sort((a, b) => b.score - a.score);

    // Apply limit/offset
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    return results.slice(offset, offset + limit);
  }

  async getBySession(sessionId: string): Promise<MemoryItem[]> {
    const items: MemoryItem[] = [];
    for (const item of this.index.values()) {
      if (item.sessionId === sessionId) {
        items.push(item);
      }
    }
    return items.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getStats(): Promise<{
    totalItems: number;
    bySourceType: Record<string, number>;
    byProject: Record<string, number>;
  }> {
    const bySourceType: Record<string, number> = {};
    const byProject: Record<string, number> = {};

    for (const item of this.index.values()) {
      bySourceType[item.sourceType] = (bySourceType[item.sourceType] || 0) + 1;
      if (item.project) {
        byProject[item.project] = (byProject[item.project] || 0) + 1;
      }
    }

    return {
      totalItems: this.index.size,
      bySourceType,
      byProject,
    };
  }

  async dedup(): Promise<number> {
    const seen = new Map<string, string>(); // hash -> id
    const duplicates: string[] = [];

    for (const [id, item] of this.index) {
      if (seen.has(item.hash)) {
        duplicates.push(id);
      } else {
        seen.set(item.hash, id);
      }
    }

    // Remove duplicates from index / 從索引中移除重複
    for (const id of duplicates) {
      this.index.delete(id);
    }

    // Note: We don't remove from disk to keep append-only nature
    // 注意：我們不移除磁盤數據以保持追加寫特性

    return duplicates.length;
  }
}
