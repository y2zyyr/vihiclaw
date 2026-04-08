# Reference Project Research Notes / 參考項目研究筆記

## Research Objective / 研究目標

Deep analysis of three reference projects (Claude Code CLI, OpenClaw, Nanobot) to extract design patterns, engineering techniques, and "black magic" tricks worth migrating to VIHIclaw.

---

## A. Claude Code CLI Deep Dive / 深度研究

### Key Files Analyzed / 分析的關鍵文件

#### 1. `src/entrypoints/cli.tsx` - Bootstrap Entrypoint
**Black Magic / 黑科技:**
- **Fast-path for --version**: Zero module imports, immediate return
  ```typescript
  if (args.length === 1 && args[0] === '--version') {
    console.log(`${MACRO.VERSION} (Claude Code)`);
    return;
  }
  ```
- **Dynamic imports for all non-critical paths**: All imports use `await import()` to delay module evaluation
- **Feature flag dead code elimination**: Uses `feature('FLAG_NAME')` for build-time code elimination via `bun:bundle`

**Migration Strategy / 遷移策略:**
Implement fast-path checks before any module loading; use dynamic imports for CLI subcommands

#### 2. `src/utils/startupProfiler.ts` - Startup Performance Profiler
**Black Magic / 黑科技:**
- **Performance hooks with sampling**: Only 0.5% of external users pay profiling cost
  ```typescript
  const STATSIG_SAMPLE_RATE = 0.005;
  const STATSIG_LOGGING_SAMPLED = process.env.USER_TYPE === 'ant' || Math.random() < STATSIG_SAMPLE_RATE;
  ```
- **Conditional memory snapshots**: Only captured when `CLAUDE_CODE_PROFILE_STARTUP=1`
- **Phase-based reporting**: Predefined phase definitions for structured logging
  ```typescript
  const PHASE_DEFINITIONS = {
    import_time: ['cli_entry', 'main_tsx_imports_loaded'],
    init_time: ['init_function_start', 'init_function_end'],
  };
  ```

**Migration Strategy / 遷移策略:**
Implement optional startup profiling with environment variable toggle; use performance.mark() for checkpoints

#### 3. `src/state/store.ts` - Lightweight State Management
**Black Magic / 黑科技:**
- **Custom store without Redux**: ~30 lines implementing getState/setState/subscribe
  ```typescript
  export function createStore<T>(initialState: T): Store<T> {
    let state = initialState;
    const listeners = new Set<Listener>();
    return {
      getState: () => state,
      setState: (updater) => {
        const prev = state;
        const next = updater(prev);
        if (Object.is(next, prev)) return; // Immutability check
        state = next;
        for (const listener of listeners) listener();
      },
      subscribe: (listener) => { /* ... */ }
    };
  }
  ```

**Migration Strategy / 遷移策略:**
Use custom lightweight store instead of Redux; implement shallow equality checks

#### 4. `src/services/tools/toolOrchestration.ts` - Tool Concurrency Control
**Black Magic / 黑科技:**
- **Smart tool partitioning**: Separates concurrency-safe from non-safe tools
  ```typescript
  function partitionToolCalls(toolUses: ToolUseBlock[]): Batch[] {
    return toolUses.reduce((acc, toolUse) => {
      const isConcurrencySafe = tool?.isConcurrencySafe?.(parsedInput.data) ?? false;
      // Merge adjacent safe tools into same batch
      if (isConcurrencySafe && acc[acc.length - 1]?.isConcurrencySafe) {
        acc[acc.length - 1]!.blocks.push(toolUse);
      } else {
        acc.push({ isConcurrencySafe, blocks: [toolUse] });
      }
    }, []);
  }
  ```
- **Configurable concurrency limit**: `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` env var (default 10)
- **Context modifiers**: Deferred context updates after concurrent execution

**Migration Strategy / 遷移策略:**
Implement tool batching based on concurrency safety; run read-only tools in parallel

#### 5. `src/main.tsx` - Parallel Initialization
**Black Magic / 黑科技:**
- **Parallel prefetching**: Multiple independent async operations started simultaneously
  ```typescript
  startMdmRawRead();      // MDM settings
  startKeychainPrefetch(); // OAuth + API keys
  ```
- **profileCheckpoint markers**: ~20 checkpoints marking startup phases
- **Lazy require for circular deps**: Uses `require()` inside functions to avoid circular imports
  ```typescript
  const getTeammateUtils = () => require('./utils/teammate.js');
  ```

**Migration Strategy / 遷移策略:**
Parallelize independent initialization tasks; use lazy requires for optional dependencies

---

## B. OpenClaw Analysis / OpenClaw 分析

### Key Files / 關鍵文件
- `src/agents/pi-embedded-runner/run.ts` - Main agent loop
- `src/agents/pi-embedded-runner/run/attempt.ts` - Single attempt execution
- `src/agents/tools/common.ts` - Tool type definitions

### Patterns Worth Adopting / 值得採用的模式

1. **Failover Error Classification**
   ```typescript
   type FailoverReason = 'auth' | 'billing' | 'rate_limit' | 'context_overflow' | 'unknown';
   function classifyFailoverReason(error: Error): FailoverReason;
   ```
   - Systematic error classification for retry decisions
   - Context overflow detection with token count extraction

2. **Auth Profile Management**
   - Multiple auth profiles with health tracking
   - Automatic failover between profiles
   - Mark profiles as failed/good based on results

3. **Model Switching Logic**
   - Live model switching without session restart
   - Model capability detection
   - Graceful degradation

### To Avoid / 避免的設計
- Overly complex nested loops in run.ts (1600+ lines)
- Global singleton state with Symbol.for

---

## C. Nanobot Analysis / Nanobot 分析

### Key Files / 關鍵文件
- `nanobot/agent/loop.py` - Core agent loop
- `nanobot/agent/runner.py` - Agent runner
- `nanobot/bus/queue.py` - Message bus
- `nanobot/session/manager.py` - Session management

### Patterns Worth Adopting / 值得採用的模式

1. **Facade + Message Bus Architecture**
   ```python
   class Nanobot:
       def __init__(self):
           self.bus = MessageBus()
           self.tool_registry = ToolRegistry()
   ```
   - Clean separation between channels and agent
   - Async queue for message passing (only 45 lines!)

2. **Tool Decorator Pattern**
   ```python
   @tool_parameters({
       "type": "object",
       "properties": {"path": {"type": "string"}},
       "required": ["path"]
   })
   class ReadFileTool(Tool):
       async def execute(self, params): ...
   ```
   - Declarative parameter schema
   - Automatic JSON Schema generation

3. **JSONL Session Storage**
   - One line per message
   - Append-only for efficiency
   - No database dependency

4. **Hook System**
   - 6 lifecycle hooks (before_iteration, on_stream, etc.)
   - Extension without subclassing

### To Avoid / 避免的設計
- Large files (loop.py 779 lines, runner.py 723 lines)
- MCP coupling in tool registry

---

## Original VIHIclaw Architecture / VIHIclaw 原創架構

### Design Decisions / 設計決策

| Aspect | Claude Code | OpenClaw | Nanobot | VIHIclaw (Original) |
|--------|-------------|----------|---------|---------------------|
| Agent Loop | React-based | Nested loops | Python async | **State machine driven** |
| State Mgmt | Custom store | Global singleton | Facade | **Dependency injection** |
| Tool Def | Interface | Generic+Pipeline | Decorator | **Decorator+Interface hybrid** |
| Concurrency | Partition+batch | Complex scheduling | Semaphore | **Simple serial (configurable)** |
| UI | Ink (React) | Custom | None | **Readline** |
| Storage | File-based | File-based | JSONL | **JSONL (optimized)** |

### Black Magic Adaptations / 黑科技適配

1. **Fast-path Version Check** (from cli.tsx)
   - VIHIclaw implementation: Check `--version` before importing heavy modules

2. **Startup Profiling** (from startupProfiler.ts)
   - VIHIclaw implementation: Optional `VIHI_PROFILE_STARTUP` env var
   - Sampling-based to avoid overhead

3. **Lightweight Store** (from store.ts)
   - VIHIclaw implementation: Simple createStore with immer-style updates

4. **Tool Partitioning** (from toolOrchestration.ts)
   - VIHIclaw implementation: Simplified version with dry-run awareness

5. **Parallel Init** (from main.tsx)
   - VIHIclaw implementation: Promise.all for independent async operations

6. **Error Classification** (from OpenClaw)
   - VIHIclaw implementation: Retryable vs non-retryable error types

7. **Message Bus** (from Nanobot)
   - VIHIclaw implementation: Type-safe event emitter pattern

8. **Tool Decorators** (from Nanobot)
   - VIHIclaw implementation: TypeScript decorators with Zod validation

### Intentional Differences / 刻意差異化

1. **No React/Ink**: Uses readline for simplicity
2. **No Feature Flags**: Environment variables instead
3. **No Global State**: Explicit dependency injection
4. **Flat Config**: 2 layers vs 5+ layers
5. **Serial by Default**: Concurrency opt-in, not default

---

## Research Completion / 研究完成

**Date**: 2024-04-08
**Status**: All three projects analyzed; key techniques identified and adapted
**Next**: Implement VIHIclaw v0.1+ with original architecture
