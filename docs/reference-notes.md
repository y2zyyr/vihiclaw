# 参考项目研究笔记

## 研究目标
深入分析三个参考项目（Claude Code CLI、OpenClaw、Nanobot），提取可借鉴的设计思想，明确边界，形成原创架构方案。

---

## A. Claude Code CLI 研究

### 阅读的关键文件
- `src/entrypoints/cli.tsx` - CLI入口，快速路径优化
- `src/commands.ts` - 命令注册系统
- `src/screens/REPL.tsx` - 主REPL组件
- `src/state/store.ts` - 轻量级状态管理
- `src/Tool.ts` - 工具基类定义
- `src/tools/FileEditTool/FileEditTool.ts` - 文件编辑工具
- `src/services/tools/toolOrchestration.ts` - 工具编排

### 借鉴的设计思想
1. **启动性能优化** - 快速路径模式，零依赖加载常用操作
2. **工具化架构** - 统一Tool接口（inputSchema, execute, render）
3. **轻量级Store** - 自定义createStore，不依赖Redux
4. **分层状态管理** - 本地UI状态 vs 全局应用状态 vs 持久化状态
5. **动态命令发现** - 支持从多个来源加载命令

### 明确避免
1. **过度复杂的特性门控** - 代码中大量`feature()`检查增加认知负担
2. **庞大的单体文件** - REPL.tsx 5005行、main.tsx 4683行
3. **复杂的工具并发控制** - partitionToolCalls, context modifiers等过于复杂
4. **React for CLI** - 学习曲线陡峭，简单CLI使用readline即可
5. **Bun特有特性** - 使用标准Node.js确保兼容性

---

## B. OpenClaw 研究

### 阅读的关键文件
- `src/agents/pi-embedded-runner/run.ts` - 核心agent运行循环
- `src/agents/pi-embedded-runner/run/attempt.ts` - 单次尝试执行逻辑
- `src/agents/tools/common.ts` - Tool类型定义
- `src/agents/pi-tools.ts` - Tool创建与配置
- `src/agents/subagent-spawn.ts` - 子agent生成
- `src/infra/agent-events.ts` - 事件系统

### 借鉴的设计思想
1. **Agent Loop结构** - `while(true)` + 显式退出条件 + 分层重试
2. **Tool抽象层** - 类型安全 + 装饰器模式定义工具参数
3. **策略管道模式** - Tool权限检查使用可组合的管道
4. **事件驱动架构** - 所有关键操作产生结构化事件
5. **防御性重试** - 区分可重试错误和致命错误，压缩恢复上下文溢出
6. **显式依赖注入** - 使用defaultDeps + setDepsForTest模式

### 明确避免
1. **过于复杂的嵌套循环** - run.ts中多层嵌套循环和标志位组合
2. **全局单例状态** - agent-events.ts使用Symbol.for创建全局单例
3. **弱类型Tool抽象** - AnyAgentTool丢失类型安全
4. **同步文件操作** - Session store使用同步文件读写
5. **过度配置化** - 配置层级过多（global → agent → session → runtime）

---

## C. Nanobot 研究

### 阅读的关键文件
- `nanobot/agent/loop.py` - 核心Agent循环
- `nanobot/agent/runner.py` - 代理运行器
- `nanobot/agent/context.py` - 上下文构建器
- `nanobot/agent/tools/base.py` - 工具基类
- `nanobot/agent/tools/registry.py` - 工具注册表
- `nanobot/bus/queue.py` - 消息总线
- `nanobot/config/schema.py` - Pydantic配置模式
- `nanobot/providers/base.py` - LLM提供者基类
- `nanobot/session/manager.py` - 会话管理

### 借鉴的设计思想
1. **Facade + 消息总线** - Nanobot类作为唯一入口，MessageBus解耦组件
2. **轻量级设计** - 4500行代码实现完整Agent功能
3. **工具装饰器模式** - `@tool_parameters`声明式定义，自动生成JSON Schema
4. **配置即代码** - Pydantic模型定义配置，自动获得验证和文档
5. **简洁的工程组织** - 水平切片（功能维度）+ 垂直切片（core vs extra）
6. **会话状态管理** - JSONL文件存储，每会话一行，内存缓存+延迟写入
7. **钩子系统** - 6个生命周期钩子实现扩展，避免子类化

### 明确避免
1. **大文件问题** - loop.py 779行、runner.py 723行过于庞大
2. **通道代码重复** - 15个通道有大量重复代码
3. **配置模式过于复杂** - ProvidersConfig包含20+个提供者配置
4. **工具注册与MCP耦合** - MCP工具和普通工具混合
5. **缺乏中间件机制** - 日志、监控需要在每个通道实现

---

## 原创架构设计

### 核心设计原则
1. **简洁优先** - 功能完整但代码量最小化，避免过度工程
2. **类型安全** - 端到端TypeScript类型，不牺牲类型安全换取灵活性
3. **扁平配置** - 最多两层配置层级，减少心智负担
4. **显式优于隐式** - 依赖注入而非全局单例，明确的数据流
5. **渐进式复杂** - 从简单串行开始，按需增加并发和重试

### 模块边界
```
cli/         - CLI入口和命令解析
agent/       - Agent循环核心（精简版，避免大文件）
tools/       - 工具实现 + 注册表
providers/   - LLM提供者抽象
session/     - 会话管理和持久化
context/     - 上下文组装和消息管理
bus/         - 轻量级消息总线（参考Nanobot，45行级别）
config/      - 配置管理（Pydantic风格）
utils/       - 工具函数
```

### Agent Loop设计（原创简化版）
```typescript
// 避免OpenClaw的复杂嵌套循环，使用状态机思想
class AgentLoop {
  private state: 'idle' | 'thinking' | 'executing' | 'paused' | 'done';
  
  async run(input: string): Promise<void> {
    while (this.state !== 'done') {
      switch (this.state) {
        case 'idle': this.state = await this.think(); break;
        case 'thinking': this.state = await this.getResponse(); break;
        case 'executing': this.state = await this.executeTools(); break;
        case 'paused': this.state = await this.handlePause(); break;
      }
    }
  }
}
```

### Tool系统设计（原创组合方案）
```typescript
// 结合OpenClaw的类型安全和Nanobot的装饰器
interface Tool<TParams, TResult> {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(params: TParams): Promise<TResult>;
}

// 装饰器风格（借鉴Nanobot）
@tool({
  name: 'read_file',
  description: 'Read file contents',
  parameters: { type: 'object', properties: {...}, required: ['path'] }
})
class ReadFileTool implements Tool<...> { }
```

### 配置设计（原创扁平化）
```typescript
// 避免OpenClaw的多层配置，扁平化设计
interface Config {
  // Provider设置
  provider: 'anthropic' | 'openai' | 'local';
  model: string;
  apiKey?: string;
  
  // Agent行为
  maxIterations: number;
  temperature: number;
  
  // 安全设置
  allowedCommands: string[];
  dryRun: boolean;
  
  // 会话设置
  sessionDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

### 与参考项目的差异总结

| 特性 | Claude Code | OpenClaw | Nanobot | 本项目（原创） |
|------|-------------|----------|---------|----------------|
| Agent Loop | React组件化 | 复杂嵌套循环 | Python异步循环 | 状态机驱动 |
| 状态管理 | 轻量级Store | 全局单例 | Facade模式 | 依赖注入容器 |
| Tool定义 | 类+接口 | 泛型+管道 | 装饰器 | 装饰器+接口组合 |
| 配置层级 | 多层 | 5+层 | 2层 | 扁平单层 |
| UI框架 | Ink(React) | 自定义 | 无 | readline |
| 并发控制 | 复杂分区 | 复杂调度 | 信号量 | 简单串行/可选并发 |

### 文件组织（原创调整）
```
src/
  cli/
    index.ts        - 入口，快速路径
    commands.ts     - 命令注册
    repl.ts         - REPL实现
  agent/
    loop.ts         - 状态机驱动的循环（<400行）
    types.ts        - Agent类型定义
  tools/
    base.ts         - Tool接口
    registry.ts     - 注册表
    read.ts         - 读文件工具
    write.ts        - 写文件工具
    edit.ts         - 编辑工具
    shell.ts        - Shell执行工具
    search.ts       - 搜索工具
    dir.ts          - 目录工具
  providers/
    base.ts         - 提供者接口
    anthropic.ts    - Claude实现
    openai.ts       - GPT实现
  session/
    manager.ts      - 会话管理
    store.ts        - JSONL存储
  context/
    builder.ts      - 上下文组装
  config/
    schema.ts       - Pydantic风格配置
    loader.ts       - 配置加载
  bus/
    index.ts        - 轻量级总线
  utils/
    logger.ts       - 日志
    errors.ts       - 错误类型
```

### 刻意避免过度相似
1. **不复制代码** - 所有代码重新实现，仅借鉴设计思想
2. **不同命名风格** - 避免与参考项目相同的文件名和函数名
3. **简化复杂部分** - 参考项目中过度复杂的部分主动简化
4. **不同实现策略** - 同样功能使用不同实现方式（如状态机vs嵌套循环）
5. **独立演进** - 不为兼容性而模仿，功能按需裁剪
