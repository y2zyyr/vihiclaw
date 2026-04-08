# VIHIclaw Architecture / VIHIclaw 架構

## Overview / 概述

VIHIclaw is a local-first AI coding agent CLI tool focused on simplicity, type safety, and extensibility / VIHIclaw 是一個本地優先的 AI 編程代理 CLI 工具，專注於簡潔性、類型安全和可擴展性。

---

## Architecture Principles / 架構原則

### 1. Simplicity First / 簡潔優先
- Complete functionality with minimal code complexity / 功能完整但代碼複雜度最小化
- Avoid over-engineering / 避免過度工程
- Start simple, add complexity only when needed / 從簡單開始，按需增加複雜度

### 2. Type Safety / 類型安全
- End-to-end TypeScript types / 端到端 TypeScript 類型
- Catch errors at compile time / 編譯時捕獲錯誤
- Never sacrifice type safety for flexibility / 不為靈活性犧牲類型安全

### 3. Flat Configuration / 扁平配置
- Maximum 2 configuration layers / 最多兩層配置
- Reduce cognitive load / 減少心智負擔
- Sensible defaults for 99% of use cases / 99% 場景的合理默認值

### 4. Explicit over Implicit / 顯式優於隱式
- Dependency injection over global singletons / 依賴注入而非全局單例
- Clear data flow / 明確的數據流
- Explicit module boundaries / 顯式的模塊邊界

---

## System Architecture / 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Entry     │  │  Commands   │  │       REPL          │ │
│  │  (index.ts) │  │ (commands.ts)│  │    (repl.ts)        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────────┼────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent Core                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Agent Loop                         │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────────────┐   │   │
│  │  │  IDLE   │──▶│THINKING │──▶│   EXECUTING     │   │   │
│  │  └─────────┘   └─────────┘   └─────────────────┘   │   │
│  │       ▲                            │               │   │
│  │       └────────────────────────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Context   │   │    Tools    │   │  Providers  │
│   Builder   │   │   Registry  │   │   (LLM)     │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## Module Design / 模塊設計

### 1. CLI Layer / CLI 層

#### Responsibilities / 職責
- Command-line argument parsing / 命令行參數解析
- Command routing / 命令路由
- REPL interaction / REPL 交互

#### Key Components / 關鍵組件

**cli/index.ts** - Entry point with fast-path optimization / 帶快速路徑優化的入口點
```typescript
export async function main(argv: string[]): Promise<void> {
  // Fast-path: --version without module loading / 快速路徑：無需模塊加載的 --version
  if (argv.includes('--version')) {
    console.log(VERSION);
    return;
  }
  // Normal path with dynamic imports / 帶動態導入的正常路徑
}
```

**cli/repl.ts** - Interactive REPL / 交互式 REPL
- Uses Node.js readline / 使用 Node.js readline
- Supports command shortcuts / 支持命令快捷方式
- State change callbacks / 狀態變更回調

---

### 2. Agent Core / 代理核心

#### Responsibilities / 職責
- Agent main loop (state machine driven) / 代理主循環（狀態機驅動）
- Task lifecycle management / 任務生命周期管理
- Error recovery and retry / 錯誤恢復和重試

#### State Machine Design / 狀態機設計

```typescript
type AgentState = 
  | 'idle'      // Waiting for input / 等待輸入
  | 'thinking'  // LLM inference / LLM 推理中
  | 'executing' // Tool execution / 工具執行中
  | 'paused'    // Paused (confirmation needed) / 暫停（需要確認）
  | 'done';     // Completed / 完成

class AgentLoop {
  private state: AgentState = 'idle';
  
  async run(userInput: string): Promise<void> {
    while (this.state !== 'done') {
      switch (this.state) {
        case 'thinking':
          this.state = await this.think();
          break;
        case 'executing':
          this.state = await this.executeTools();
          break;
      }
    }
  }
}
```

**Advantages over nested loops / 相對嵌套循環的優勢:**
- Clear state transitions / 清晰的狀態轉換
- Easy to debug / 易於調試
- Simple to extend with new states / 易於擴展新狀態

---

### 3. Tools System / 工具系統

#### Responsibilities / 職責
- Tool definition and registration / 工具定義和註冊
- Parameter validation / 參數驗證
- Execution and error handling / 執行和錯誤處理

#### Interface Design / 接口設計

```typescript
// Tool base interface / 工具基礎接口
interface Tool<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  parameters: ToolDefinition['parameters'];
  execute(params: TParams, context: ToolContext): Promise<TResult>;
  isConcurrencySafe?(params: TParams): boolean;
}

// Decorator style / 裝飾器風格
function defineTool<TParams, TResult>(
  name: string,
  description: string,
  parameters: JSONSchema,
  execute: (params: TParams, ctx: ToolContext) => Promise<TResult>
): Tool<TParams, TResult>;
```

#### Concurrency Control / 並發控制

Based on Claude Code CLI's partition strategy / 基於 Claude Code CLI 的分區策略：

```typescript
// Tool declares concurrency safety / 工具聲明並發安全性
const readFileTool = defineTool(
  'read_file',
  'Read file contents',
  parameters,
  async (params, ctx) => { /* ... */ }
);

// Mark as concurrency-safe / 標記為並發安全
readFileTool.isConcurrencySafe = () => true;

// Batch execution / 批次執行
async function executeTools(toolCalls: ToolCall[]) {
  const safeTools = toolCalls.filter(tc => 
    registry.get(tc.name)?.isConcurrencySafe?.(tc.arguments)
  );
  // Run safe tools in parallel / 並行執行安全工具
  await Promise.all(safeTools.map(tc => executeTool(tc)));
}
```

---

### 4. Providers / 提供者

#### Responsibilities / 職責
- LLM API encapsulation / LLM API 封裝
- Streaming response handling / 流式響應處理
- Error retry logic / 錯誤重試邏輯

#### Interface / 接口

```typescript
interface LLMProvider {
  readonly name: string;
  complete(params: CompletionParams): Promise<CompletionResult>;
  completeStream?(params: CompletionParams): AsyncIterable<StreamChunk>;
}
```

---

### 5. Session & Context / 會話與上下文

#### Responsibilities / 職責
- Conversation history management / 對話歷史管理
- Session persistence / 會話持久化
- Token management / Token 管理

#### Design / 設計

```typescript
// JSONL-based storage / 基於 JSONL 的存儲
class SessionStore {
  async appendMessage(sessionId: string, message: Message): Promise<void> {
    const line = JSON.stringify({ type: 'message', ...message });
    await fs.appendFile(filePath, line + '\n');
  }
}

// Context builder with truncation / 帶截斷的上下文構建
class ContextBuilder {
  private messages: Message[] = [];
  
  getMessages(): Message[] {
    return this.truncateMessages(this.messages);
  }
  
  private truncateMessages(msgs: Message[]): Message[] {
    // Keep recent messages under token limit / 保留 token 限制內的最近消息
    return msgs.slice(-MAX_CONTEXT_MESSAGES);
  }
}
```

---

### 6. Configuration / 配置

#### Flat Configuration Layers / 扁平配置層級

```typescript
interface ClawConfig {
  // Provider settings / 提供者設置
  provider: 'anthropic' | 'openai' | 'local';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  
  // Agent behavior / 代理行為
  maxIterations: number;
  temperature: number;
  maxTokens?: number;
  
  // Safety settings / 安全設置
  dryRun: boolean;
  confirmDestructive: boolean;
  allowedShellCommands: string[];
  blockedPaths: string[];
  
  // Paths / 路徑
  sessionDir: string;
  logDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

#### Loading Priority / 加載優先級

1. Config file (`~/.claw/config.json`) / 配置文件
2. Environment variables (`CLAW_*`) / 環境變量
3. CLI arguments (`--provider`, `--model`) / 命令行參數
4. Runtime overrides / 運行時覆蓋

---

### 7. Performance Profiling / 性能分析

Based on Claude Code CLI's startupProfiler / 基於 Claude Code CLI 的 startupProfiler：

```typescript
// Optional profiling with sampling / 帶采樣的可選分析
const SHOULD_PROFILE = process.env.CLAW_PROFILE_STARTUP === '1';

export function profileCheckpoint(name: string): void {
  if (!SHOULD_PROFILE) return;
  performance.mark(name);
}

// Usage in startup phases / 在啟動階段使用
profileCheckpoint('cli_entry');
// ... load modules / 加載模塊
profileCheckpoint('modules_loaded');
// ... initialize / 初始化
profileCheckpoint('init_complete');
```

---

## Data Flow / 數據流

### Single Interaction Flow / 單次交互流程

```
User Input / 用戶輸入
    │
    ▼
┌─────────────┐
│    CLI      │
│   (REPL)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Agent Loop  │
│   (think)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Context   │
│   Builder   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Provider   │◀───▶│    LLM      │
│ (API call)  │     │   Service   │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│   Response  │
│ (toolCalls?)│
└──────┬──────┘
       │
       ├── No ──▶ Save to context ──▶ Return to user / 保存到上下文 ──▶ 返回用戶
       │
       └── Yes
           │
           ▼
    ┌─────────────┐
    │  Tool Loop  │
    │ (execute)   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Results   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Context   │
    │  (update)   │
    └─────────────┘
           │
           └──────▶ Continue loop / 繼續循環
```

---

## Extension Points / 擴展點

### Adding New Tools / 添加新工具

```typescript
// tools/my_tool.ts
export const myTool = defineTool({
  name: 'my_tool',
  description: 'Does something useful / 執行有用操作',
  parameters: {
    type: 'object',
    properties: {
      arg: { type: 'string' },
    },
    required: ['arg'],
  },
  async execute(params, ctx) {
    // Implementation / 實現
    return result;
  },
});

// Register / 註冊
registry.register(myTool);
```

### Adding New Providers / 添加新提供者

```typescript
export class MyProvider implements LLMProvider {
  readonly name = 'my-provider';
  
  async complete(params: CompletionParams): Promise<CompletionResult> {
    // API implementation / API 實現
  }
}
```

---

## Security Design / 安全設計

### 1. Tool Safety Levels / 工具安全級別
- **safe**: Read-only operations, no confirmation needed / 只讀操作，無需確認
- **confirm**: Modification operations, user confirmation required / 修改操作，需要用戶確認
- **blocked**: Completely prohibited / 完全禁止

### 2. Path Security / 路徑安全
- Check path against allowlist / 檢查路徑是否在允許列表
- Block sensitive paths (.env, .ssh, etc.) / 阻止敏感路徑
- Resolve relative paths to absolute / 將相對路徑解析為絕對路徑

### 3. Shell Security / Shell 安全
- Whitelist of allowed commands / 允許命令的白名單
- Argument escaping to prevent injection / 參數轉義防止注入
- Timeout controls / 超時控制

### 4. Dry Run Mode / 模擬運行模式
- All tools print without execution / 所有工具只打印不執行
- For testing and debugging / 用於測試和調試

---

## Evolution Roadmap / 演進路線圖

### v0.1 (Current) / 當前版本
- [x] CLI entry and REPL / CLI 入口和 REPL
- [x] State machine agent loop / 狀態機代理循環
- [x] Basic tools / 基礎工具
- [x] Multi-provider support / 多提供者支持
- [x] Session management / 會話管理
- [x] Structured logging / 結構化日誌
- [x] Performance profiling / 性能分析

### v0.2 / 下個版本
- [ ] Streaming responses / 流式響應
- [ ] Tool concurrency / 工具並發
- [ ] More built-in tools / 更多內置工具
- [ ] Session resume / 會話恢復

### v0.3 / 未來版本
- [ ] Plugin system / 插件系統
- [ ] MCP support / MCP 支持
- [ ] Web UI / Web 界面
