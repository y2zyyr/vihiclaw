const MAX_CONTEXT_MESSAGES = 50;
/**
 * ContextBuilder manages the conversation context
 * Handles message history, token estimation, and context truncation
 */
export class ContextBuilder {
    messages = [];
    constructor(initialMessages = []) {
        this.messages = [...initialMessages];
    }
    /**
     * Estimate token count (rough approximation)
     * ~4 characters per token on average
     */
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    /**
     * Get all messages
     */
    getMessages() {
        return this.messages;
    }
    /**
     * Add a user message
     */
    addUserMessage(content) {
        this.messages.push({
            role: 'user',
            content,
        });
        this.truncateIfNeeded();
    }
    /**
     * Add an assistant message (optionally with tool calls)
     */
    addAssistantMessage(content, toolCalls) {
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
    addToolResult(toolCallId, content) {
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
    truncateIfNeeded() {
        if (this.messages.length > MAX_CONTEXT_MESSAGES) {
            // Keep system context (first message if any) and recent messages
            const firstMessage = this.messages[0];
            const recentMessages = this.messages.slice(-MAX_CONTEXT_MESSAGES + 1);
            if (firstMessage && this.messages.length > 1) {
                this.messages = [firstMessage, ...recentMessages];
            }
            else {
                this.messages = recentMessages;
            }
        }
    }
    /**
     * Clear all messages
     */
    clear() {
        this.messages = [];
    }
    /**
     * Get the last message
     */
    getLastMessage() {
        return this.messages[this.messages.length - 1];
    }
    /**
     * Get total estimated token count
     */
    getEstimatedTokens() {
        const text = this.messages.map((m) => m.content).join('');
        return this.estimateTokens(text);
    }
    /**
     * Export messages for storage
     */
    export() {
        return [...this.messages];
    }
    /**
     * Import messages from storage
     */
    import(messages) {
        this.messages = [...messages];
    }
}
//# sourceMappingURL=builder.js.map