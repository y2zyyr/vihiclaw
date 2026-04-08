# Claw 架构设计文档

## 项目概述
Claw 是一个本地优先的 AI coding agent CLI 工具，专注于简洁、类型安全和可扩展性。

---

## 架构原则

### 1. 简洁优先
- 功能完整但代码量最小化
- 避免过度工程和不必要的抽象
- 从简单开始，按需增加复杂度

### 2. 类型安全
- 端到端 TypeScript 类型
- 编译时捕获错误
- 不因灵活性牺牲类型安全

### 3. 扁平配置
- 最多两层配置层级
- 减少心智负担
- 合理默认值，多数场景无需配置

### 4. 显式优于隐式
- 依赖注入而非全局单例
- 明确的数据流
- 清晰的模块边界

---

## 系统架构

### 整体架构图

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

## 模块详细设计

### 1. CLI Layer

#### 职责
- 命令行参数解析
- 命令路由
- REPL 交互

#### 关键组件
```typescript
// cli/index.ts
export async function main(argv: string[]): Promise<void> {
  // 快速路径：--version, --help 不加载其他模块
  if (argv.includes('--version')) {
    console.log(VERSION);
    return;
  }
  
  // 正常路径：加载配置并执行
  const config = await loadConfig();
  const command = parseCommand(argv);
  await executeCommand(command, config);
}

// cli/repl.ts
export class REPL {
  private rl: readline.Interface;
  private agent: Agent;
  
  async start(): Promise<void> {
    // REPL 循环实现
  }
}
```

---

### 2. Agent Core

#### 职责
- Agent 主循环（状态机驱动）
- 任务生命周期管理
- 错误恢复和重试

#### 状态机设计
```typescript
type AgentState = 
  | 'idle'      // 等待输入
  | 'thinking'  // LLM 推理中
  | 'executing' // 工具执行中
  | 'paused'    // 暂停（需要确认）
  | 'done';     // 完成

class AgentLoop {
  private state: AgentState = 'idle';
  private context: Context;
  
  async run(userInput: string): Promise<void> {
    this.context.addUserMessage(userInput);
    this.state = 'thinking';
    
    while (this.state !== 'done') {
      switch (this.state) {
        case 'thinking':
          this.state = await this.think();
          break;
        case 'executing':
          this.state = await this.executeTools();
          break;
        case 'paused':
          this.state = await this.handleUserConfirm();
          break;
      }
    }
  }
  
  private async think(): Promise<AgentState> {
    const response = await this.provider.complete({
      messages: this.context.getMessages(),
      tools: this.tools.getDefinitions(),
    });
    
    if (response.toolCalls) {
      this.pendingToolCalls = response.toolCalls;
      return 'executing';
    }
    
    this.context.addAssistantMessage(response.content);
    return 'done';
  }
}
```

---

### 3. Tools System

#### 职责
- 工具定义和注册
- 参数验证
- 执行和错误处理

#### 接口设计
```typescript
// tools/base.ts
interface Tool<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(params: TParams, context: ToolContext): Promise<TResult>;
}

interface ToolContext {
  session: Session;
  logger: Logger;
  dryRun: boolean;
}

// 装饰器定义（简化版）
interface ToolDefinition<TParams, TResult> {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: TParams, ctx: ToolContext) => Promise<TResult>;
}

function defineTool<TParams, TResult>(
  def: ToolDefinition<TParams, TResult>
): Tool<TParams, TResult> {
  return { ...def };
}
```

#### 内置工具
| 工具名 | 功能 | 安全级别 |
|--------|------|----------|
| read_file | 读取文件内容 | safe |
| write_file | 写入/覆盖文件 | confirm |
| edit_file | 文本编辑（diff） | confirm |
| list_dir | 列出目录内容 | safe |
| search_text | 文本搜索 | safe |
| run_shell | 执行 shell 命令 | confirm |

---

### 4. Providers

#### 职责
- LLM API 封装
- 流式响应处理
- 错误重试

#### 接口设计
```typescript
// providers/base.ts
interface LLMProvider {
  readonly name: string;
  
  complete(params: CompletionParams): Promise<CompletionResult>;
  completeStream(params: CompletionParams): AsyncIterable<StreamChunk>;
}

interface CompletionParams {
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

interface CompletionResult {
  content: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
}
```

#### 支持提供者
- Anthropic (Claude)
- OpenAI (GPT)
- Local (OpenAI-compatible API)

---

### 5. Session & Context

#### 职责
- 对话历史管理
- 会话持久化
- Token 管理

#### 设计
```typescript
// session/manager.ts
interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  metadata: Record<string, unknown>;
}

class SessionManager {
  private store: SessionStore;
  
  async create(): Promise<Session> {
    const session: Session = {
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      metadata: {},
    };
    await this.store.save(session);
    return session;
  }
  
  async load(sessionId: string): Promise<Session | null> {
    return this.store.load(sessionId);
  }
  
  async appendMessage(sessionId: string, message: Message): Promise<void> {
    await this.store.appendMessage(sessionId, message);
  }
}

// context/builder.ts
class ContextBuilder {
  private session: Session;
  private maxTokens: number;
  
  getMessages(): Message[] {
    // 实现 token 截断策略
    return this.truncateMessages(this.session.messages);
  }
  
  addUserMessage(content: string): void {
    this.session.messages.push({ role: 'user', content });
  }
  
  addAssistantMessage(content: string, toolCalls?: ToolCall[]): void {
    this.session.messages.push({ 
      role: 'assistant', 
      content,
      toolCalls 
    });
  }
  
  addToolResult(toolCallId: string, content: string): void {
    this.session.messages.push({
      role: 'tool',
      toolCallId,
      content,
    });
  }
}
```

---

### 6. Configuration

#### 配置层级（扁平化）
```typescript
// config/schema.ts
interface ClawConfig {
  // Provider 设置
  provider: 'anthropic' | 'openai' | 'local';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  
  // Agent 行为
  maxIterations: number;
  temperature: number;
  maxTokens?: number;
  
  // 安全设置
  dryRun: boolean;
  confirmDestructive: boolean;
  allowedShellCommands: string[];
  blockedPaths: string[];
  
  // 会话设置
  sessionDir: string;
  logDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // 功能开关
  streamResponse: boolean;
  saveSession: boolean;
}

// 默认值
const DEFAULT_CONFIG: Partial<ClawConfig> = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  maxIterations: 50,
  temperature: 0.7,
  dryRun: false,
  confirmDestructive: true,
  allowedShellCommands: ['ls', 'cat', 'echo', 'grep', 'find'],
  blockedPaths: ['.env', '.ssh', '.aws'],
  sessionDir: '~/.claw/sessions',
  logDir: '~/.claw/logs',
  logLevel: 'info',
  streamResponse: true,
  saveSession: true,
};
```

#### 加载优先级
1. 配置文件 (`~/.claw/config.json`)
2. 环境变量 (`CLAW_PROVIDER`, `CLAW_API_KEY` 等)
3. 命令行参数 (`--provider`, `--model` 等)
4. 运行时覆盖

---

### 7. Message Bus

#### 职责
- 组件间解耦通信
- 事件广播
- 轻量级实现

#### 设计
```typescript
// bus/index.ts
type EventType = 
  | 'agent:start'
  | 'agent:think'
  | 'agent:tool_call'
  | 'agent:tool_result'
  | 'agent:complete'
  | 'agent:error'
  | 'tool:execute';

interface BusEvent {
  type: EventType;
  payload: unknown;
  timestamp: number;
}

type EventHandler = (event: BusEvent) => void | Promise<void>;

class MessageBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  
  on(event: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    // 返回取消订阅函数
    return () => this.handlers.get(event)?.delete(handler);
  }
  
  emit(event: EventType, payload: unknown): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    
    const busEvent: BusEvent = {
      type: event,
      payload,
      timestamp: Date.now(),
    };
    
    for (const handler of handlers) {
      try {
        handler(busEvent);
      } catch (error) {
        console.error(`Event handler error for ${event}:`, error);
      }
    }
  }
}
```

---

## 数据流

### 单次交互流程

```
User Input
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
       ├── No ──▶ Save to context ──▶ Return to user
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
    │   Tools     │
    │  (execute)  │
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
           └──────▶ Continue loop
```

---

## 扩展点

### 1. 添加新工具
```typescript
// tools/my_tool.ts
export const myTool = defineTool({
  name: 'my_tool',
  description: 'Does something useful',
  parameters: {
    type: 'object',
    properties: {
      arg: { type: 'string' },
    },
    required: ['arg'],
  },
  async execute(params, ctx) {
    // 实现
    return result;
  },
});

// 注册
registry.register(myTool);
```

### 2. 添加新 Provider
```typescript
// providers/my_provider.ts
export class MyProvider implements LLMProvider {
  readonly name = 'my-provider';
  
  async complete(params: CompletionParams): Promise<CompletionResult> {
    // 实现 API 调用
  }
  
  async *completeStream(params: CompletionParams): AsyncIterable<StreamChunk> {
    // 实现流式响应
  }
}
```

---

## 安全设计

### 1. 工具执行安全
- **Safe 级别**：只读操作，无需确认
- **Confirm 级别**：需要用户确认
- **Block 级别**：完全禁止

### 2. 路径安全
- 检查路径是否在允许列表
- 禁止访问敏感路径（.env, .ssh 等）
- 相对路径解析为绝对路径

### 3. Shell 安全
- 只允许配置的命令
- 参数转义防止注入
- 超时控制

### 4. Dry Run 模式
- 所有工具只打印不执行
- 用于测试和调试

---

## 性能考虑

### 1. 启动优化
- 快速路径：--version, --help 不加载其他模块
- 延迟加载：非必要模块按需导入

### 2. 内存管理
- Token 估算和上下文截断
- 会话历史自动清理

### 3. 并发控制
- 默认串行执行（简单可靠）
- 可选并发模式（高级用户）

---

## 测试策略

### 单元测试
- 每个工具独立测试
- Provider 使用 mock
- 配置加载测试

### 集成测试
- 端到端 Agent 循环测试
- 真实工具执行（沙箱环境）

### 示例验证
- 每个示例任务必须可运行
- 作为回归测试

---

## 演进路线

### v0.1 (MVP)
- [x] CLI 入口和 REPL
- [x] Agent 循环（状态机）
- [x] 基础工具（read, write, edit, list, search, shell）
- [x] Anthropic Provider
- [x] 会话管理和日志
- [x] 配置系统
- [x] Dry Run 模式

### v0.2
- [ ] OpenAI Provider
- [ ] 流式响应
- [ ] 工具并发执行
- [ ] 更多内置工具

### v0.3
- [ ] 插件系统
- [ ] MCP 支持
- [ ] 多会话管理
- [ ] Web UI
