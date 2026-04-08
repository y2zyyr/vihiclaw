import { Message, ToolCall } from '../types/index.js';

const MAX_CONTEXT_MESSAGES = 50;

/**
 * ContextBuilder manages the conversation context
 * Handles message history, token estimation, and context truncation
 */
export class ContextBuilder {
  private messages: Message[] = [];

  constructor(initialMessages: Message[] = []) {
    this.messages = [...initialMessages];
  }

  /**
   * Estimate token count (rough approximation)
   * ~4 characters per token on average
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get all messages
   */
  getMessages(): Message[] {
    return this.messages;
  }

  /**
   * Add a user message
   */
  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content,
    });
    this.truncateIfNeeded();
  }

  /**
   * Add an assistant message (optionally with tool calls)
   */
  addAssistantMessage(content: string, toolCalls?: ToolCall[]): void {
    this.messages.push({
      role: 'assistant',
      content,
      toolCalls,
    });
    this.truncateIfNeeded();
  }

  /**
   * Add a tool result message
   */
  addToolResult(toolCallId: string, content: string): void {
    this.messages.push({
      role: 'tool',
      content,
      toolCallId,
    });
    this.truncateIfNeeded();
  }

  /**
   * Truncate context if it gets too long
   * Keeps the most recent messages
   */
  private truncateIfNeeded(): void {
    if (this.messages.length > MAX_CONTEXT_MESSAGES) {
      // Keep system context (first message if any) and recent messages
      const firstMessage = this.messages[0];
      const recentMessages = this.messages.slice(-MAX_CONTEXT_MESSAGES + 1);

      if (firstMessage && this.messages.length > 1) {
        this.messages = [firstMessage, ...recentMessages];
      } else {
        this.messages = recentMessages;
      }
    }
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Get the last message
   */
  getLastMessage(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  /**
   * Get total estimated token count
   */
  getEstimatedTokens(): number {
    const text = this.messages.map((m) => m.content).join('');
    return this.estimateTokens(text);
  }

  /**
   * Export messages for storage
   */
  export(): Message[] {
    return [...this.messages];
  }

  /**
   * Import messages from storage
   */
  import(messages: Message[]): void {
    this.messages = [...messages];
  }
}
