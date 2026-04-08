// Helper to convert our Message format to Anthropic format
export function toAnthropicMessages(messages) {
    return messages
        .filter((m) => m.role !== 'tool')
        .map((m) => ({
        role: m.role,
        content: m.content,
    }));
}
// Helper to convert our ToolDefinition to Anthropic format
export function toAnthropicTools(tools) {
    return tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
    }));
}
//# sourceMappingURL=base.js.map