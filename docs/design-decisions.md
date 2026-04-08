# 设计决策记录

## 技术栈选择

### 决策：使用 TypeScript + Node.js

**原因：**
- 参考项目 Claw Code CLI 和 OpenClaw 都是 TypeScript，证明该领域 TypeScript 生态成熟
- 类型安全对 Agent 系统很重要（工具参数、API 响应）
- Node.js 异步模型适合 IO 密集型任务（API 调用、文件操作）
- 更好的跨平台支持

**未选择 Python 的原因：**
- 虽然 Nanobot 是 Python，但无充分理由切换
- TypeScript 的类型系统更严格
- Node.js 在 CLI 工具领域有更好生态（commander, chalk, ora 等）

---

## 架构决策

### 决策：状态机驱动的 Agent Loop

**方案对比：**
| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| OpenClaw 嵌套循环 | 功能完整 | 代码复杂，难以理解 | ❌ |
| Nanobot Python 协程 | 简洁 | TypeScript 实现不同 | ❌ |
| **状态机** | 清晰、可预测、易扩展 | 需要定义状态 | ✅ |

**决策理由：**
- 避免 OpenClaw 的复杂嵌套循环
- 状态转换清晰，易于调试
- 方便添加新状态（如 pause、confirm）

---

### 决策：扁平配置层级

**方案对比：**
- OpenClaw: 5+ 层配置（defaults → global → agent → session → runtime）
- Nanobot: 2 层（defaults + user config）

**决策：采用 2 层（默认值 + 用户配置）**

**理由：**
- 减少心智负担
- 多数场景只需修改少数参数
- 环境变量覆盖足够灵活

---

### 决策：依赖注入而非全局单例

**方案对比：**
- OpenClaw 使用全局单例（Symbol.for），测试时容易污染
- Nanobot 使用 Facade 模式，但仍有一定耦合

**决策：显式依赖注入**

**理由：**
- 便于单元测试（可 mock 依赖）
- 明确的数据流
- 避免隐藏的全局状态

**实现方式：**
```typescript
// 不这样做
const toolRegistry = getGlobalRegistry();

// 这样做
class Agent {
  constructor(
    private toolRegistry: ToolRegistry,
    private provider: LLMProvider,
    private sessionManager: SessionManager
  ) {}
}
```

---

### 决策：readline 而非 Ink（React for CLI）

**方案对比：**
- Claude Code 使用 Ink，功能强大但学习曲线陡峭
- 简单 readline 足够满足 REPL 需求

**决策：使用 Node.js 内置 readline**

**理由：**
- 零额外依赖
- 学习成本低
- MVP 阶段足够使用
- 后续可迁移到 Ink 如果需要复杂 UI

---

## 工具系统设计

### 决策：装饰器 + 接口组合定义工具

**方案对比：**
- OpenClaw: 纯接口，类型安全但样板代码多
- Nanobot: Python 装饰器，简洁

**决策：TypeScript 装饰器风格 + 接口**

**实现：**
```typescript
interface Tool<TParams, TResult> {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(params: TParams, ctx: ToolContext): Promise<TResult>;
}

function defineTool<TParams, TResult>(def: ToolDefinition<TParams, TResult>): Tool<TParams, TResult> {
  return def;
}
```

**理由：**
- 保持类型安全
- 声明式定义，可读性好
- 自动生成 JSON Schema

---

### 决策：工具串行执行（默认）

**方案对比：**
- Claude Code: 复杂并发控制（partitionToolCalls）
- OpenClaw: 也有并发调度

**决策：默认串行，保留并发扩展点**

**理由：**
- 简化初始实现
- 避免并发导致的竞态条件
- Agent 通常一次只调用一个工具
- 后续可按需添加并发

---

## 存储设计

### 决策：JSONL 文件存储

**方案对比：**
- 数据库：太重，引入运维负担
- 纯 JSON：追加效率低
- JSONL：每行一个 JSON，追加友好

**决策：JSONL 格式存储会话**

**理由（借鉴 Nanobot）：**
- 轻量级，无数据库依赖
- 追加写入 O(1)
- 人类可读
- 便于版本控制（如有需要）

---

## 错误处理

### 决策：分层错误处理

**错误分类：**
1. **用户错误**：配置错误、参数错误 → 清晰提示，立即退出
2. **可重试错误**：网络超时、API 限流 → 自动重试，指数退避
3. **致命错误**：认证失败、配置错误 → 快速失败，不重试
4. **工具错误**：命令不存在、权限不足 → 返回给 LLM，继续对话

**实现：**
```typescript
class ClawError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean
  ) {
    super(message);
  }
}
```

---

## 安全决策

### 决策：三级安全模型

**级别定义：**
1. **safe**: 只读操作（read_file, list_dir, search_text）
2. **confirm**: 修改操作（write_file, edit_file, run_shell）
3. **blocked**: 完全禁止

**决策理由：**
- 平衡安全和便利
- 默认保护，允许用户配置
- dry-run 模式用于测试

---

### 决策：Shell 命令白名单

**决策：默认只允许安全命令**

```typescript
const DEFAULT_ALLOWED_COMMANDS = [
  'ls', 'cat', 'echo', 'grep', 'find', 
  'head', 'tail', 'wc', 'pwd', 'which'
];
```

**理由：**
- 防止误操作（rm -rf /）
- 用户可配置扩展
- 明确的安全边界

---

## 扩展性决策

### 决策：注册表模式

**实现：**
```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }
}
```

**理由：**
- 简单有效
- 运行时动态注册
- 便于插件系统扩展

---

## 日志决策

### 决策：结构化日志 + 文件日志

**实现：**
- 控制台：人类可读的彩色输出
- 文件：结构化 JSON，便于分析

**理由：**
- 开发时友好（彩色控制台）
- 生产可观测（结构化日志）
- 便于问题排查

---

## 待决策项

### 1. 流式响应支持
- **状态**: 待实现
- **选项**: Server-Sent Events vs WebSocket vs HTTP/2
- **倾向**: SSE，简单且支持良好

### 2. 插件系统架构
- **状态**: v0.2 考虑
- **选项**: 动态导入 vs 配置文件
- **倾向**: 动态导入，简单直接

### 3. MCP 支持
- **状态**: v0.3 考虑
- **评估**: 是否必要？Nanobot 已实现，但耦合度高
- **倾向**: 独立实现，不依赖 MCP 规范
