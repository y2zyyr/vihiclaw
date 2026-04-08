export class ToolRegistry {
    tools = new Map();
    register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool "${tool.name}" is already registered`);
        }
        this.tools.set(tool.name, tool);
    }
    get(name) {
        return this.tools.get(name);
    }
    getAll() {
        return Array.from(this.tools.values());
    }
    getDefinitions() {
        return this.getAll().map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        }));
    }
    unregister(name) {
        return this.tools.delete(name);
    }
    clear() {
        this.tools.clear();
    }
}
//# sourceMappingURL=registry.js.map