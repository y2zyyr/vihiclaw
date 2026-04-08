import { Tool } from './base.js';
import { ToolDefinition } from '../types/index.js';
export declare class ToolRegistry {
    private tools;
    register(tool: Tool): void;
    get(name: string): Tool | undefined;
    getAll(): Tool[];
    getDefinitions(): ToolDefinition[];
    unregister(name: string): boolean;
    clear(): void;
}
//# sourceMappingURL=registry.d.ts.map