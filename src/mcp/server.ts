/**
 * MCP Server Implementation / MCP 服務器實現
 * Phase 2 Round 7 - Model Context Protocol integration / 模型上下文協議集成
 *
 * Simplified MCP-compatible server using JSON-RPC over stdio / 簡化的 MCP 兼容服務器，使用 stdio 上的 JSON-RPC
 */

import { ToolRegistry } from '../tools/registry.js';
import { createLogger } from '../utils/logger.js';

export interface MCPServerConfig {
  name: string;
  version: string;
  toolRegistry: ToolRegistry;
  logger?: ReturnType<typeof createLogger>;
}

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export class MCPServer {
  private toolRegistry: ToolRegistry;
  private logger: ReturnType<typeof createLogger>;
  private config: MCPServerConfig;
  private running = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.toolRegistry = config.toolRegistry;
    this.logger = config.logger || createLogger('error');
  }

  private createResponse(id: number | string, result: unknown): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  private createError(id: number | string, code: number, message: string): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message },
    };
  }

  private async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    switch (request.method) {
      case 'initialize': {
        return this.createResponse(request.id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: this.config.name,
            version: this.config.version,
          },
        });
      }

      case 'tools/list': {
        const tools = this.toolRegistry.getAll().map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
        }));

        return this.createResponse(request.id, { tools });
      }

      case 'tools/call': {
        const params = request.params as { name: string; arguments: Record<string, unknown> };
        const tool = this.toolRegistry.get(params.name);

        if (!tool) {
          return this.createError(request.id, -32602, `Tool not found: ${params.name}`);
        }

        try {
          const result = await tool.execute(params.arguments, {
            sessionId: 'mcp-session',
            logger: this.logger,
            dryRun: false,
            workingDir: process.cwd(),
          });

          return this.createResponse(request.id, {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              },
            ],
          });
        } catch (error) {
          return this.createError(request.id, -32603, String(error));
        }
      }

      default:
        return this.createError(request.id, -32601, `Method not found: ${request.method}`);
    }
  }

  async start(): Promise<void> {
    this.running = true;
    this.logger.info('MCP Server started on stdio / MCP 服務器在 stdio 上啟動');

    // Handle stdin / 處理 stdin
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', async (chunk) => {
      try {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          const request: JSONRPCRequest = JSON.parse(line);
          const response = await this.handleRequest(request);
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (error) {
        this.logger.error('MCP: Failed to process request', { error: String(error) });
      }
    });

    // Keep alive / 保持運行
    while (this.running) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.logger.info('MCP Server stopped / MCP 服務器已停止');
  }
}
