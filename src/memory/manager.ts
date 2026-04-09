/**
 * Memory Manager / 記憶管理器
 * Integrates with agent loop to capture memories / 與代理循環集成以捕獲記憶
 */

import { MemoryStore } from './store.js';
import { MemoryItem, MemorySearchOptions, MemorySearchResult, ContextPack } from './types.js';
import { ToolExecutionTrace } from '../agent/types.js';

export interface MemoryManagerConfig {
  memoryDir: string;
  autoCapture: boolean;
  captureToolExecutions: boolean;
  captureConversations: boolean;
}

export class MemoryManager {
  private store: MemoryStore;
  private config: MemoryManagerConfig;
  private currentIngestRunId: string;

  constructor(config: MemoryManagerConfig) {
    this.store = new MemoryStore(config.memoryDir);
    this.config = config;
    this.currentIngestRunId = `ingest-${Date.now()}`;
  }

  async initialize(): Promise<void> {
    await this.store.initialize();
  }

  /**
   * Capture tool execution as memory / 捕獲工具執行為記憶
   */
  async captureToolExecution(
    sessionId: string,
    toolName: string,
    input: Record<string, unknown>,
    output: string,
    trace: ToolExecutionTrace
  ): Promise<MemoryItem> {
    if (!this.config.captureToolExecutions) {
      return null as unknown as MemoryItem;
    }

    const content = `[Tool: ${toolName}]
Input: ${JSON.stringify(input)}
Output: ${output}
Duration: ${trace.duration || 0}ms
Status: ${trace.status}`;

    return this.store.add({
      sourceType: 'tool_execution',
      contentRaw: content,
      timestamp: new Date(trace.startTime).toISOString(),
      actor: 'assistant',
      topic: toolName,
      entityRefs: this.extractEntities(input, output),
      provenance: `tool_execution:${trace.toolCallId}`,
      ingestRunId: this.currentIngestRunId,
      sessionId,
    });
  }

  /**
   * Capture conversation message / 捕獲對話消息
   */
  async captureConversation(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    toolCalls?: { name: string; arguments: Record<string, unknown> }[]
  ): Promise<MemoryItem> {
    if (!this.config.captureConversations) {
      return null as unknown as MemoryItem;
    }

    let fullContent = content;
    if (toolCalls && toolCalls.length > 0) {
      fullContent += '\n[Tool Calls]: ' + JSON.stringify(toolCalls);
    }

    return this.store.add({
      sourceType: 'conversation',
      contentRaw: fullContent,
      timestamp: new Date().toISOString(),
      actor: role === 'user' ? 'user' : 'assistant',
      topic: this.inferTopic(content),
      entityRefs: this.extractEntitiesFromText(content),
      provenance: `conversation:${role}`,
      ingestRunId: this.currentIngestRunId,
      sessionId,
    });
  }

  /**
   * Capture decision / 捕獲決策
   */
  async captureDecision(
    sessionId: string,
    decision: string,
    context: string,
    alternatives?: string[]
  ): Promise<MemoryItem> {
    const content = `[Decision]: ${decision}
[Context]: ${context}
${alternatives ? `[Alternatives]: ${alternatives.join(', ')}` : ''}`;

    return this.store.add({
      sourceType: 'decision',
      contentRaw: content,
      timestamp: new Date().toISOString(),
      actor: 'assistant',
      topic: 'decision',
      provenance: 'decision_capture',
      ingestRunId: this.currentIngestRunId,
      sessionId,
    });
  }

  /**
   * Search memories / 搜索記憶
   */
  async search(options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    return this.store.search(options);
  }

  /**
   * Get memories by session / 按會話獲取記憶
   */
  async getSessionMemories(sessionId: string): Promise<MemoryItem[]> {
    return this.store.getBySession(sessionId);
  }

  /**
   * Assemble context pack / 組裝上下文包
   */
  async assembleContextPack(
    sessionId: string,
    packType: ContextPack['packType'],
    targetTask: string,
    options?: {
      timeRange?: { from: string; to: string };
      entities?: string[];
    }
  ): Promise<ContextPack> {
    // Search for relevant memories / 搜索相關記憶
    const searchResults = await this.search({
      sessionId,
      timeRange: options?.timeRange,
      entities: options?.entities,
      limit: 20,
    });

    const items = searchResults.map(r => r.item);

    // Separate by source type / 按來源類型分離
    const rawFragments = items.filter(i => i.sourceType === 'tool_execution' || i.sourceType === 'conversation');

    return {
      id: `pack-${Date.now()}`,
      packType,
      targetTask,
      timeRange: options?.timeRange,
      keyEntities: options?.entities || [],
      rawFragments,
      derivedSummaries: [], // TODO: integrate with derivation layer
      assembledAt: new Date().toISOString(),
    };
  }

  /**
   * Get statistics / 獲取統計
   */
  async getStats(): Promise<ReturnType<MemoryStore['getStats']>> {
    return this.store.getStats();
  }

  /**
   * Deduplicate memories / 去重記憶
   */
  async dedup(): Promise<number> {
    return this.store.dedup();
  }

  private extractEntities(input: Record<string, unknown>, _output: string): string[] {
    const entities: string[] = [];

    // Extract file paths from input / 從輸入提取文件路徑
    for (const value of Object.values(input)) {
      if (typeof value === 'string') {
        if (value.includes('/') || value.includes('\\')) {
          entities.push(`file:${value.split('/').pop() || value}`);
        }
      }
    }

    // TODO: Extract entities from output as well
    // 待辦：從輸出中也提取實體

    return [...new Set(entities)];
  }

  private extractEntitiesFromText(text: string): string[] {
    const entities: string[] = [];

    // Simple pattern matching for common entities / 簡單模式匹配常見實體
    const filePattern = /[\w\-]+\.(ts|js|json|md|py)/gi;
    const matches = text.match(filePattern);
    if (matches) {
      entities.push(...matches.map(m => `file:${m}`));
    }

    return [...new Set(entities)];
  }

  private inferTopic(content: string): string {
    // Simple topic inference / 簡單主題推斷
    if (content.includes('test')) return 'testing';
    if (content.includes('git')) return 'version_control';
    if (content.includes('config')) return 'configuration';
    if (content.includes('error') || content.includes('bug')) return 'debugging';
    return 'general';
  }
}
