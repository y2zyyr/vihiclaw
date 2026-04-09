/**
 * Error Recovery System / 錯誤恢復系統
 * Phase 2 Round 10 - Resilient error handling / 彈性錯誤處理
 */

import { AgentState } from '../types/index.js';

export interface RecoveryStrategy {
  name: string;
  canHandle: (error: Error, state: AgentState) => boolean;
  execute: (error: Error, context: RecoveryContext) => Promise<RecoveryResult>;
}

export interface RecoveryContext {
  attempt: number;
  maxAttempts: number;
  lastState: AgentState;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface RecoveryResult {
  success: boolean;
  action: 'retry' | 'skip' | 'abort' | 'fallback';
  delayMs?: number;
  message: string;
  fallbackValue?: unknown;
}

// Retry with exponential backoff / 指數退避重試
export const retryStrategy: RecoveryStrategy = {
  name: 'retry',
  canHandle: (error, _state) => {
    // Retry on transient errors / 對瞬態錯誤重試
    const retryablePatterns = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'rate limit',
      'timeout',
      'temporarily unavailable',
    ];
    return retryablePatterns.some(p => error.message.toLowerCase().includes(p));
  },
  execute: async (_error, context) => {
    const delayMs = Math.min(1000 * Math.pow(2, context.attempt), 30000);

    if (context.attempt < context.maxAttempts) {
      return {
        success: true,
        action: 'retry',
        delayMs,
        message: `Retrying after ${delayMs}ms (attempt ${context.attempt + 1}/${context.maxAttempts})`,
      };
    }

    return {
      success: false,
      action: 'abort',
      message: `Max retries (${context.maxAttempts}) exceeded`,
    };
  },
};

// Skip and continue / 跳過並繼續
export const skipStrategy: RecoveryStrategy = {
  name: 'skip',
  canHandle: (error, state) => {
    // Skip on non-critical tool failures / 非關鍵工具失敗時跳過
    return state === 'executing' && !error.message.includes('critical');
  },
  execute: async (error, _context) => {
    return {
      success: true,
      action: 'skip',
      message: `Skipped due to error: ${error.message}`,
      fallbackValue: { success: false, error: error.message },
    };
  },
};

// Fallback to alternative / 回退到備選方案
export const fallbackStrategy: RecoveryStrategy = {
  name: 'fallback',
  canHandle: (error, _state) => {
    return error.message.includes('not found') || error.message.includes('unsupported');
  },
  execute: async (error, _context) => {
    return {
      success: true,
      action: 'fallback',
      message: `Using fallback for: ${error.message}`,
      fallbackValue: null,
    };
  },
};

export class RecoveryManager {
  private strategies: RecoveryStrategy[];
  private attemptCounts: Map<string, number> = new Map();

  constructor(strategies: RecoveryStrategy[] = [retryStrategy, skipStrategy, fallbackStrategy]) {
    this.strategies = strategies;
  }

  async attemptRecovery(
    error: Error,
    state: AgentState,
    context: Omit<RecoveryContext, 'attempt' | 'maxAttempts'>
  ): Promise<RecoveryResult> {
    const key = `${state}:${error.message}`;
    const attempt = this.attemptCounts.get(key) || 0;
    this.attemptCounts.set(key, attempt + 1);

    const recoveryContext: RecoveryContext = {
      ...context,
      attempt,
      maxAttempts: 3,
    };

    for (const strategy of this.strategies) {
      if (strategy.canHandle(error, state)) {
        const result = await strategy.execute(error, recoveryContext);

        if (result.success) {
          // Reset counter on successful recovery / 成功恢復時重置計數
          if (result.action !== 'retry') {
            this.attemptCounts.delete(key);
          }
          return result;
        }
      }
    }

    return {
      success: false,
      action: 'abort',
      message: `No recovery strategy found for: ${error.message}`,
    };
  }

  reset(): void {
    this.attemptCounts.clear();
  }
}
