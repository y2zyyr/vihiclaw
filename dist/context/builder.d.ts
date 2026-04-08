import { Message, ToolCall } from '../types/index.js';
/**
 * ContextBuilder manages the conversation context
 * Handles message history, token estimation, and context truncation
 */
export declare class ContextBuilder {
    private messages;
    constructor(initialMessages?: Message[]);
    /**
     * Estimate token count (rough approximation)
     * ~4 characters per token on average
     */
    private estimateTokens;
    /**
     * Get all messages
     */
    getMessages(): Message[];
    /**
     * Add a user message
     */
    addUserMessage(content: string): void;
    /**
     * Add an assistant message (optionally with tool calls)
     */
    addAssistantMessage(content: string, toolCalls?: ToolCall[]): void;
    /**
     * Add a tool result message
     */
    addToolResult(toolCallId: string, content: string): void;
    /**
     * Truncate context if it gets too long
     * Keeps the most recent messages
     */
    private truncateIfNeeded;
    /**
     * Clear all messages
     */
    clear(): void;
    /**
     * Get the last message
     */
    getLastMessage(): Message | undefined;
    /**
     * Get total estimated token count
     */
    getEstimatedTokens(): number;
    /**
     * Export messages for storage
     */
    export(): Message[];
    /**
     * Import messages from storage
     */
    import(messages: Message[]): void;
}
//# sourceMappingURL=builder.d.ts.map