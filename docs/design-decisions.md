# Design Decisions / 設計決策

## Tech Stack Selection / 技術棧選擇

### Decision: TypeScript + Node.js

**Reasons / 原因：**
- Reference projects Claude Code CLI and OpenClaw both use TypeScript / 參考項目 Claude Code CLI 和 OpenClaw 都使用 TypeScript
- Type safety is crucial for agent systems / 類型安全對代理系統至關重要
- Node.js async model fits IO-intensive tasks / Node.js 異步模型適合 IO 密集型任務
- Better cross-platform support / 更好的跨平台支持

**Why not Python / 不選 Python 的原因：**
- No compelling reason to switch / 沒有充分理由切換
- TypeScript's type system is stricter / TypeScript 的類型系統更嚴格
- Better CLI tooling ecosystem / 更好的 CLI 工具生態

---

## Architecture Decisions / 架構決策

### Decision: State Machine Driven Agent Loop

**Options Comparison / 方案對比：**
| Approach | Pros | Cons | Choice |
|----------|------|------|--------|
| OpenClaw nested loops | Feature complete / 功能完整 | Complex code / 代碼複雜 | ❌ |
| Nanobot Python coroutines | Simple / 簡潔 | Different TS implementation / TS 實現不同 | ❌ |
| **State machine** | Clear, predictable / 清晰、可預測 | Requires state definition / 需要定義狀態 | ✅ |

**Decision Reason / 決策原因：**
- Avoid OpenClaw's complex nested loops / 避免 OpenClaw 的複雜嵌套循環
- Clear state transitions, easy to debug / 清晰的狀態轉換，易於調試
- Easy to add new states / 易於添加新狀態

---

### Decision: Flat Configuration Hierarchy

**Options / 方案對比：**
- OpenClaw: 5+ layers / 5+ 層（defaults → global → agent → session → runtime）
- Nanobot: 2 layers / 2 層

**Decision: 2 layers (defaults + user config) / 決策：2 層（默認值 + 用戶配置）**

**Reasons / 原因：**
- Reduce cognitive load / 減少心智負擔
- Most scenarios only need to modify a few parameters / 多數場景只需修改少數參數
- Environment variable overrides are flexible enough / 環境變量覆蓋足夠靈活

---

### Decision: Dependency Injection over Global Singletons

**Options Comparison / 方案對比：**
- OpenClaw uses global singletons (Symbol.for), causes test pollution / OpenClaw 使用全局單例，導致測試污染
- Nanobot uses Facade pattern but still has coupling / Nanobot 使用 Facade 模式但仍有耦合

**Decision: Explicit dependency injection / 決策：顯式依賴注入**

**Reasons / 原因：**
- Easy unit testing (can mock dependencies) / 易於單元測試（可 mock 依賴）
- Clear data flow / 明確的數據流
- Avoid hidden global state / 避免隱藏的全局狀態

**Implementation / 實現方式：**
```typescript
// Not this way / 不這樣做
const toolRegistry = getGlobalRegistry();

// Do this / 這樣做
class Agent {
  constructor(
    private toolRegistry: ToolRegistry,
    private provider: LLMProvider,
    private sessionManager: SessionManager
  ) {}
}
```

---

### Decision: Readline instead of Ink (React for CLI)

**Options Comparison / 方案對比：**
- Claude Code uses Ink, powerful but steep learning curve / Claude Code 使用 Ink，功能強大但學習曲線陡
- Simple readline is sufficient for REPL needs / 簡單的 readline 足夠滿足 REPL 需求

**Decision: Use Node.js built-in readline / 決策：使用 Node.js 內置 readline**

**Reasons / 原因：**
- Zero additional dependencies / 零額外依賴
- Low learning cost / 學習成本低
- Sufficient for MVP stage / MVP 階段足夠使用
- Can migrate to Ink later if needed / 如需可後續遷移到 Ink

---

## Tool System Design / 工具系統設計

### Decision: Decorator + Interface Hybrid

**Options / 方案對比：**
- OpenClaw: Pure interface, type-safe but verbose / 純接口，類型安全但冗長
- Nanobot: Python decorators, concise / Python 裝飾器，簡潔

**Decision: TypeScript decorator style + Interface / 決策：TypeScript 裝飾器風格 + 接口**

**Implementation / 實現：**
```typescript
interface Tool<TParams, TResult> {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(params: TParams, context: ToolContext): Promise<TResult>;
  isConcurrencySafe?(params: TParams): boolean;
}
```

**Reasons / 原因：**
- Maintain type safety / 保持類型安全
- Declarative definition, good readability / 聲明式定義，可讀性好
- Automatic JSON Schema generation / 自動生成 JSON Schema

---

### Decision: Serial Tool Execution (Default)

**Options / 方案對比：**
- Claude Code: Complex concurrency control (partitionToolCalls) / 複雜的並發控制
- OpenClaw: Also has concurrent scheduling / 也有並發調度

**Decision: Serial by default, concurrency opt-in / 決策：默認串行，並發可選**

**Reasons / 原因：**
- Simplify initial implementation / 簡化初始實現
- Avoid race conditions from concurrency / 避免並發導致的競態條件
- Agents typically call one tool at a time / 代理通常一次只調用一個工具
- Can add concurrency later if needed / 如需可後續添加並發

---

## Storage Design / 存儲設計

### Decision: JSONL File Storage

**Options / 方案對比：**
- Database: Too heavy, adds operational burden / 數據庫：太重，增加運維負擔
- Pure JSON: Poor append efficiency / 純 JSON：追加效率低
- JSONL: One JSON per line, append-friendly / JSONL：每行一個 JSON，追加友好

**Decision: JSONL format for session storage / 決策：JSONL 格式存儲會話**

**Reasons (inspired by Nanobot) / 原因（受 Nanobot 啟發）：**
- Lightweight, no database dependency / 輕量，無數據庫依賴
- Append write O(1) / 追加寫入 O(1)
- Human readable / 人類可讀
- Easy version control if needed / 如需易於版本控制

---

## Error Handling / 錯誤處理

### Decision: Layered Error Handling

**Error Classification / 錯誤分類：**
1. **User errors**: Config errors, param errors → Clear message, exit immediately / 用戶錯誤：配置錯誤、參數錯誤 → 清晰提示，立即退出
2. **Retryable errors**: Network timeout, API rate limit → Auto retry with backoff / 可重試錯誤：網絡超時、API 限流 → 自動重試，指數退避
3. **Fatal errors**: Auth failure, config errors → Fast fail, no retry / 致命錯誤：認證失敗、配置錯誤 → 快速失敗，不重試
4. **Tool errors**: Command not found, permission denied → Return to LLM, continue / 工具錯誤：命令不存在、權限不足 → 返回給 LLM，繼續對話

**Implementation / 實現：**
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

## Security Decisions / 安全決策

### Decision: Three-Level Safety Model

**Level Definitions / 級別定義：**
1. **safe**: Read-only operations, no confirmation needed / 只讀操作，無需確認
2. **confirm**: Modification operations, requires confirmation / 修改操作，需要確認
3. **blocked**: Completely prohibited / 完全禁止

**Reasons / 決策原因：**
- Balance security and convenience / 平衡安全和便利
- Default protection, allow user configuration / 默認保護，允許用戶配置
- Dry-run mode for testing / 模擬運行模式用於測試

---

### Decision: Shell Command Whitelist

**Decision: Only allow safe commands by default / 決策：默認只允許安全命令**

```typescript
const DEFAULT_ALLOWED_COMMANDS = [
  'ls', 'cat', 'echo', 'grep', 'find', 'head', 'tail', 'wc', 'pwd', 'which',
  'mkdir', 'touch', 'cp', 'mv', 'rm', 'npm', 'node', 'git'
];
```

**Reasons / 原因：**
- Prevent accidents (rm -rf /) / 防止誤操作
- User-configurable extension / 用戶可配置擴展
- Clear security boundaries / 明確的安全邊界

---

## Performance Decisions / 性能決策

### Decision: Startup Profiling (from Claude Code CLI)

**Implementation / 實現：**
```typescript
const SHOULD_PROFILE = process.env.CLAW_PROFILE_STARTUP === '1';

export function profileCheckpoint(name: string): void {
  if (!SHOULD_PROFILE) return;
  performance.mark(name);
}
```

**Reasons / 原因：**
- Optional profiling to avoid overhead / 可選分析，避免開銷
- Environment variable controlled / 環境變量控制
- Helps identify startup bottlenecks / 幫助識別啟動瓶頸

---

## Extension Decisions / 擴展決策

### Decision: Registry Pattern

**Implementation / 實現：**
```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
}
```

**Reasons / 原因：**
- Simple and effective / 簡單有效
- Dynamic registration at runtime / 運行時動態註冊
- Easy to extend with plugin system / 易於擴展插件系統

---

## Logging Decisions / 日誌決策

### Decision: Structured Logging + File Logging

**Implementation / 實現：**
- Console: Human-readable colored output / 控制台：人類可讀的彩色輸出
- File: Structured JSON for analysis / 文件：結構化 JSON 便於分析

**Reasons / 原因：**
- Developer-friendly (colored console) / 開發者友好（彩色控制台）
- Production observable (structured logs) / 生產可觀測（結構化日誌）
- Easy troubleshooting / 便於問題排查

---

## Pending Decisions / 待決策項

### 1. Streaming Response Support / 流式響應支持
- **Status**: To be implemented / 待實現
- **Options**: Server-Sent Events vs WebSocket vs HTTP/2
- **Preference**: SSE, simple and well-supported / SSE，簡單且支持良好

### 2. Plugin System Architecture / 插件系統架構
- **Status**: v0.2 consideration / v0.2 考慮
- **Options**: Dynamic import vs config file / 動態導入 vs 配置文件
- **Preference**: Dynamic import, simple and direct / 動態導入，簡單直接

### 3. MCP Support / MCP 支持
- **Status**: v0.3 consideration / v0.3 考慮
- **Evaluation**: Is it necessary? / 是否必要？
- **Preference**: Independent implementation, not dependent on MCP spec / 獨立實現，不依賴 MCP 規範
