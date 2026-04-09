import { AgentState, Message, ClawConfig } from '../types/index.js';
import { LLMProvider } from '../providers/base.js';
import { ToolRegistry } from '../tools/registry.js';
import { SessionManager } from '../session/manager.js';
import { Logger } from '../types/index.js';
import { AgentCallbacks, ToolExecutionTrace } from './types.js';
import { MemoryManager } from '../memory/manager.js';
/**
 * AgentLoop implements a state machine-driven agent loop
 *
 * States:
 * - idle: Waiting for input
 * - thinking: LLM inference in progress
 * - executing: Tool execution in progress
 * - paused: Paused (needs confirmation)
 * - done: Completed successfully
 * - error: Encountered an error
 */
export declare class AgentLoop {
    private provider;
    private toolRegistry;
    private sessionManager;
    private sessionId;
    private logger;
    private config;
    private callbacks?;
    private memoryManager?;
    private state;
    private context;
    private pendingToolCalls;
    private currentIteration;
    private toolTraces;
    constructor(provider: LLMProvider, toolRegistry: ToolRegistry, sessionManager: SessionManager, sessionId: string, logger: Logger, config: ClawConfig, callbacks?: AgentCallbacks | undefined, memoryManager?: MemoryManager | undefined);
    private setState;
    getState(): AgentState;
    getToolTraces(): ToolExecutionTrace[];
    clearToolTraces(): void;
    /**
     * Set YOLO mode (auto-confirm destructive actions)
     */
    setYolo(enabled: boolean): void;
    /**
     * Main entry point: run the agent with user input
     */
    run(userInput: string): Promise<void>;
    /**
     * Resume from paused state (e.g., after user confirmation)
     */
    resume(): Promise<void>;
    /**
     * The main state machine loop
     */
    private loop;
    private handleIdle;
    private handleThinking;
    private handleExecuting;
    private executeToolWithTracing;
    private executeTool;
    /**
     * Stop the agent loop
     */
    stop(): void;
    /**
     * Get the current conversation context
     */
    getContext(): Message[];
}
//# sourceMappingURL=loop.d.ts.map