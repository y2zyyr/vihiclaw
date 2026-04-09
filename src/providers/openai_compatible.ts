/**
 * OpenAI Compatible Provider / OpenAI 兼容提供商
 * Supports DeepSeek, MiniMax, Kimi, and other OpenAI-compatible APIs / 支持 DeepSeek、MiniMax、Kimi 等 OpenAI 兼容 API
 */

import chalk from 'chalk';
import { LLMProvider } from './base.js';
import { CompletionParams, CompletionResult, ToolCall } from '../types/index.js';

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseURL: string;
  defaultModel: string;
  headers?: Record<string, string>;  // Custom HTTP headers / 自定義 HTTP 頭
  debug?: boolean;  // Show debug output / 顯示調試輸出
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAICompletionResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = 'openai-compatible';
  private config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
  }

  // Dynamic debug toggle / 動態調試切換
  setDebug(debug: boolean): void {
    this.config.debug = debug;
  }

  async complete(params: CompletionParams, retryWithoutTools = true): Promise<CompletionResult> {
    // Detect Kimi API / 檢測 Kimi API
    const isKimi = this.config.baseURL.includes('kimi.com') || this.config.baseURL.includes('moonshot.cn');

    // Format tools for OpenAI-compatible API (requires type: "function" wrapper)
    const formattedTools = params.tools?.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }
    }));

    // Format messages for OpenAI API / 格式化消息給 OpenAI API
    // OpenAI requires tool messages to have role "tool" and tool_call_id / OpenAI 需要工具消息有 role "tool" 和 tool_call_id
    const formattedMessages = params.messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId || '',
        };
      }
      if (msg.role === 'assistant') {
        // Kimi requires reasoning_content for ALL assistant messages when thinking is enabled / Kimi 需要為所有助手消息提供 reasoning_content
        const msgAny = msg as any;
        const result: any = {
          role: 'assistant' as const,
          content: msg.content || null,
        };
        // Always include reasoning_content for Kimi / 始終為 Kimi 包含 reasoning_content
        // Kimi requires non-empty reasoning_content when thinking is enabled / Kimi 啟用 thinking 時需要非空的 reasoning_content
        if (msgAny.reasoning_content) {
          result.reasoning_content = msgAny.reasoning_content;
        } else if (isKimi) {
          result.reasoning_content = 'Processing request...';  // Non-empty placeholder / 非空佔位符
        }
        // Include tool_calls if present / 如果有則包含 tool_calls
        if (msg.toolCalls) {
          result.tool_calls = msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          }));
        }
        return result;
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    });

    // Auto-add Claude Code headers for Kimi / 為 Kimi 自動添加 Claude Code 頭
    const defaultHeaders: Record<string, string> = isKimi ? {
      'User-Agent': 'claude-code/0.1.0',
      'X-Client-Name': 'claude-code',
      'X-Client-Version': '0.1.0',
      'Accept': '*/*',
    } : {};

    // Debug: log compact message summary / 調試：記錄簡潔消息摘要
    if (this.config.debug && isKimi) {
      const summary = formattedMessages.map((m: any) => {
        if (m.role === 'tool') return `[tool:${m.tool_call_id?.slice(-6)}]`;
        if (m.role === 'assistant' && m.tool_calls) return `[assistant:${m.tool_calls.length}tools]`;
        return `[${m.role}:${m.content?.slice(0, 30)}...]`;
      }).join(' → ');
      console.log(chalk.gray(`[DEBUG] ${summary}`));
    }

    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json',
        ...defaultHeaders,  // Auto headers for Kimi / Kimi 自動頭
        ...this.config.headers,  // Merge custom headers / 合併自定義頭
      },
      body: JSON.stringify({
        model: params.model || this.config.defaultModel,
        messages: formattedMessages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        tools: formattedTools,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      // If 403 and has tools, retry without tools / 如果是 403 且有工具，尝试不用工具重试
      if (response.status === 403 && params.tools && params.tools.length > 0 && retryWithoutTools) {
        console.log(chalk.yellow('[WARN] API returned 403 with tools, retrying without tools... / API 返回 403，尝试不用工具重试...'));
        return this.complete({ ...params, tools: undefined }, false);
      }
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as OpenAICompletionResponse;
    const choice = data.choices[0];

    const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc: OpenAIToolCall) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));

    return {
      content: choice.message.content || '',
      toolCalls,
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
}
