# VIHIclaw - AI Coding Agent / AI 編程代理

## Overview / 概述

VIHIclaw is a local-first, transparent AI coding agent with:
- **Tool execution transparency** - See per-tool timing and status
- **Enhanced Git workflow** - Branch and stash management
- **Session export** - Export conversations to JSON/Markdown
- **Smart concurrency** - Read tools execute in parallel, write tools serial
- **Long-term memory** - 5-layer memory architecture
- **Multi-provider support** - Anthropic, OpenAI, DeepSeek, MiniMax, Kimi, and more
- **YOLO mode** - Auto-confirm destructive actions

## Quick Start / 快速開始

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start

# Or run with config
npm start -- --provider anthropic --model claude-sonnet-4-6
```

## Global Installation / 全局安裝

```bash
npm link
vihi  # Now available globally
```

## Configuration / 配置

### First Run / 首次運行

On first launch, the setup wizard will guide you through configuration.
Run `vihi setup` anytime to reconfigure.

### Config File / 配置文件

Create `~/.vihiclaw/config.json`:

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "apiKey": "your-api-key"
}
```

Or use environment variables:
```bash
export CLAW_PROVIDER=anthropic
export CLAW_MODEL=claude-sonnet-4-6
export CLAW_API_KEY=your-api-key
```

### Supported Providers / 支持的服務商

| Provider | Model Example | Config |
|----------|--------------|--------|
| anthropic | claude-sonnet-4-6 | `apiKey` |
| openai | gpt-4 | `apiKey` |
| deepseek | deepseek-chat | `apiKey` |
| minimax | abab6.5-chat | `apiKey` |
| kimi | moonshot-v1-8k | `apiKey` |
| other | custom model | `apiKey`, `baseUrl` |
| local | local model | `baseUrl` (default: localhost:11434) |

## REPL Commands / REPL 命令

| Command | Description |
|---------|-------------|
| `/help` | Show help |
| `/sessions` | List sessions |
| `/resume` | Resume previous session |
| `/clear` | Clear conversation |
| `/tools` | List available tools |
| `/config` | Show configuration |
| `/debug` | Show debug mode status |
| `/yolo` | Show YOLO mode status |
| `/export json` | Export session to JSON |
| `/export markdown` | Export session to Markdown |
| `/memory stats` | Show memory statistics |
| `/exit` | Exit REPL |

## Keyboard Shortcuts / 快捷鍵

| Shortcut | Description |
|----------|-------------|
| `Ctrl+O` | Toggle debug mode |
| `Ctrl+Y` | Toggle YOLO mode |
| `Ctrl+C` | Exit REPL |

## Modes / 模式

### Debug Mode / 調試模式

Shows detailed API request/response information. Toggle with `Ctrl+O` or set in config:
```json
{
  "debug": true
}
```

### YOLO Mode / YOLO 模式

Auto-confirm destructive actions (dangerous!). Toggle with `Ctrl+Y` or set in config:
```json
{
  "yolo": true
}
```

## Architecture / 架構

### Core Components / 核心組件

- `src/agent/` - Agent loop with state machine
- `src/tools/` - Tool registry and implementations
- `src/session/` - Session management and export
- `src/memory/` - Long-term memory system
- `src/providers/` - LLM provider abstractions

### Memory System / 記憶系統

Five-layer architecture / 五層架構：
1. **Facts** - Raw memory items (tool executions, conversations)
2. **Index** - Keyword and metadata search
3. **Derived** - Summaries and preferences (placeholder)
4. **Working Memory** - Context packs for agents
5. **Audit** - Provenance tracking

## Development / 開發

```bash
# Run tests
npm test

# Watch mode
npm run dev

# Clean build
npm run clean && npm run build
```

## Phase 2 Surpass Points / Phase 2 超越點

| # | Feature | Evidence |
|---|---------|----------|
| 1 | Tool execution transparency | `src/agent/loop.ts` - ToolExecutionTrace |
| 2 | Enhanced Git workflow | `src/tools/git.ts` - 5 tools, branch/stash |
| 3 | Session export | `src/session/exporter.ts` - JSON/Markdown |
| 4 | Smart concurrency | `src/agent/loop.ts` - Concurrent read tools |
| 5 | Long-term memory | `src/memory/` - 5-layer architecture |

## License / 許可證

MIT
