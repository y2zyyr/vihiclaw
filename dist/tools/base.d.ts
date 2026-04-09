import { ToolDefinition, ToolContext, ToolResult } from '../types/index.js';
export interface Tool<TParams = unknown, TResult = unknown> {
    name: string;
    description: string;
    parameters: ToolDefinition['parameters'];
    isConcurrencySafe?: boolean;
    execute(params: TParams, context: ToolContext): Promise<TResult>;
}
export interface DefineToolOptions {
    isConcurrencySafe?: boolean;
}
export declare function defineTool<TParams = Record<string, unknown>, TResult = ToolResult>(name: string, description: string, parameters: ToolDefinition['parameters'], execute: (params: TParams, context: ToolContext) => Promise<TResult>, options?: DefineToolOptions): Tool<TParams, TResult>;
//# sourceMappingURL=base.d.ts.map