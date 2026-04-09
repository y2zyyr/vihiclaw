# 🐾 VIHIclaw

A local-first AI coding agent CLI tool / 本地優先的 AI 編程代理 CLI 工具

---

## Features / 特性

- 🤖 **Agent Loop**: State machine driven agent loop with tool calling / 狀態機驅動的代理循環，支持工具調用
- 🛠️ **Built-in Tools**: File operations, Git workflow, text search, shell execution / 內置工具：文件操作、Git 工作流、文本搜索、Shell 執行
- 💬 **Interactive REPL**: Terminal-based chat interface with shortcuts / 基於終端的交互式對話界面，支持快捷鍵
- 💾 **Session Management**: Automatic persistence to local JSONL with export / 會話管理：自動持久化到本地 JSONL，支持導出
- 🧠 **Long-term Memory**: 5-layer memory architecture (MemPalace-inspired) / 長期記憶：五層架構（受 MemPalace 啟發）
- 🔄 **Smart Concurrency**: Read tools parallel, write tools serial / 智能並發：讀工具並行，寫工具串行
- 🔌 **Multi-Provider**: Anthropic, OpenAI, DeepSeek, MiniMax, Kimi, Local models / 多提供商支持
- 🚀 **Global CLI**: Install once, run anywhere with `vihi` / 全局 CLI：一次安裝，隨處使用 `vihi`
- 🛡️ **Safety First**: Command whitelist, dry-run mode, YOLO mode, path protection / 安全第一
- 📝 **Structured Logging**: Console + file dual logging / 結構化日誌

---

## Installation / 安裝

```bash
# Clone repository / 克隆倉庫
git clone <repository-url>
cd vihiclaw

# Install dependencies / 安裝依賴
npm install

# Build / 編譯
npm run build

# Link globally / 全局鏈接
npm link

# Now you can use `vihi` anywhere / 現在可以在任何地方使用 `vihi`
vihi
```

---

## Configuration / 配置

### First Run / 首次運行

On first launch, the setup wizard will guide you through configuration / 首次啟動時，設置嚮導將引導您完成配置：

```bash
vihi
# Automatically runs setup wizard if no config exists / 如果沒有配置將自動運行設置嚮導
```

### Config File / 配置文件

Create `~/.vihiclaw/config.json`:

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "apiKey": "your-api-key"
}
```

Or use environment variables / 或使用環境變量：

```bash
export CLAW_PROVIDER=anthropic
export CLAW_MODEL=claude-sonnet-4-6
export CLAW_API_KEY=your-api-key
```

### Supported Providers / 支持的服務商

| Provider | Model Example | Required Config |
|----------|--------------|-----------------|
| anthropic | claude-sonnet-4-6 | apiKey |
| openai | gpt-4 | apiKey |
| deepseek | deepseek-chat | apiKey |
| minimax | abab6.5-chat | apiKey |
| kimi | moonshot-v1-8k | apiKey |
| other | custom model | apiKey, baseUrl |
| local | local model | baseUrl (default: localhost:11434) |

---

## Usage / 使用方法

### Start REPL / 啟動交互式對話

```bash
# Interactive chat / 交互式對話
vihi

# Or explicitly / 或明確指定
vihi chat
```

### Single Question / 單次提問

```bash
vihi ask "Create a simple Express server / 創建一個簡單的 Express 服務器"
```

### Reconfigure / 重新配置

```bash
vihi setup
```

### Session Management / 會話管理

```bash
# List all sessions / 列出所有會話
vihi session list

# Delete a session / 刪除會話
vihi session delete <session-id>

# Resume session on startup / 啟動時恢復會話
vihi --resume <session-id>
```

---

## REPL Commands / REPL 命令

| Command | Description |
|---------|-------------|
| `/help` | Show help / 顯示幫助 |
| `/sessions` | List available sessions / 列出可用會話 |
| `/resume` | Resume previous session / 恢復上一個會話 |
| `/clear` | Clear conversation / 清除對話 |
| `/tools` | List available tools / 列出可用工具 |
| `/config` | Show configuration / 顯示配置 |
| `/debug` | Show debug mode status / 顯示調試模式狀態 |
| `/yolo` | Show YOLO mode status / 顯示 YOLO 模式狀態 |
| `/export json` | Export session to JSON / 導出會話為 JSON |
| `/export markdown` | Export session to Markdown / 導出會話為 Markdown |
| `/memory stats` | Show memory statistics / 顯示記憶統計 |
| `/exit` | Exit REPL / 退出 REPL |

## Keyboard Shortcuts / 快捷鍵

| Shortcut | Description |
|----------|-------------|
| `Ctrl+O` | Toggle debug mode / 切換調試模式 |
| `Ctrl+Y` | Toggle YOLO mode / 切換 YOLO 模式 |
| `Ctrl+C` | Exit REPL / 退出 REPL |

---

## Modes / 模式

### Debug Mode / 調試模式

Shows detailed API request/response information / 顯示詳細的 API 請求/響應信息：

- Toggle with `Ctrl+O` / 使用 `Ctrl+O` 切換
- Or set in config / 或在配置中設置： `"debug": true`

### YOLO Mode / YOLO 模式

Auto-confirm destructive actions (use with caution!) / 自動確認危險操作（謹慎使用！）：

- Toggle with `Ctrl+Y` / 使用 `Ctrl+Y` 切換
- Or set in config / 或在配置中設置： `"yolo": true`

### Dry-Run Mode / 模擬運行模式

Preview actions without executing / 預覽操作而不執行：

```bash
vihi --dry-run
```

---

## Available Tools / 可用工具

### File Tools / 文件工具

| Tool | Function | Safety |
|------|----------|--------|
| `read_file` | Read file content / 讀取文件內容 | safe |
| `write_file` | Write/overwrite file / 寫入/覆蓋文件 | confirm |
| `edit_file` | Text edit (diff-style) / 文本編輯 | confirm |
| `list_dir` | List directory contents / 列出目錄內容 | safe |
| `search_text` | Text search (regex support) / 文本搜索 | safe |

### Git Tools / Git 工具

| Tool | Function |
|------|----------|
| `git_status` | Check repository status / 檢查倉庫狀態 |
| `git_diff` | Show changes / 顯示更改 |
| `git_log` | Show commit history / 顯示提交歷史 |
| `git_branch` | Manage branches (list/create/delete/switch) / 管理分支 |
| `git_stash` | Manage stashes (list/push/pop/apply/drop) / 管理儲藏 |

### System Tools / 系統工具

| Tool | Function | Safety |
|------|----------|--------|
| `run_shell` | Execute shell command / 執行 shell 命令 | confirm |

---

## Architecture / 架構

### Core Components / 核心組件

- `src/agent/` - Agent loop with state machine / 代理循環與狀態機
- `src/tools/` - Tool registry and implementations / 工具註冊表與實現
- `src/session/` - Session management and export / 會話管理與導出
- `src/memory/` - Long-term memory system / 長期記憶系統
- `src/providers/` - LLM provider abstractions / LLM 提供商抽象

### Memory System / 記憶系統

Five-layer architecture / 五層架構：
1. **Facts** - Raw memory items / 原始記憶項
2. **Index** - Keyword and metadata search / 關鍵詞與元數據搜索
3. **Derived** - Summaries and preferences / 摘要與偏好
4. **Working Memory** - Context packs for agents / 代理上下文包
5. **Audit** - Provenance tracking / 溯源追蹤

---

## Project Structure / 項目結構

```
src/
  cli/           # CLI entry, REPL, commands / CLI 入口、REPL、命令
  agent/         # Agent loop core / 代理循環核心
  tools/         # Tool implementations / 工具實現
  providers/     # LLM providers / LLM 提供商
  session/       # Session management / 會話管理
  memory/        # Long-term memory / 長期記憶
  context/       # Context builder / 上下文構建
  config/        # Configuration management / 配置管理
  utils/         # Utilities / 工具函數
  types/         # Type definitions / 類型定義
```

---

## Development / 開發

```bash
# Development mode (auto-compile) / 開發模式
npm run dev

# Run tests / 運行測試
npm test

# Clean build output / 清理編譯輸出
npm run clean

# Full rebuild / 完全重建
npm run clean && npm run build
```

---

## Phase 2 Surpass Points / Phase 2 超越點

| # | Feature | Evidence |
|---|---------|----------|
| 1 | Tool execution transparency | `src/agent/loop.ts` - ToolExecutionTrace |
| 2 | Enhanced Git workflow | `src/tools/git.ts` - 5 tools, branch/stash |
| 3 | Session export | `src/session/exporter.ts` - JSON/Markdown |
| 4 | Smart concurrency | `src/agent/loop.ts` - Concurrent read tools |
| 5 | Long-term memory | `src/memory/` - 5-layer architecture |

---

## Safety Notes / 安全說明

- Shell commands have whitelist restrictions / Shell 命令有白名單限制
- File edit operations create backups / 文件編輯操作會創建備份
- Sensitive paths (.env, .ssh, etc.) are blocked by default / 敏感路徑默認被阻止
- Use `--dry-run` to preview actions / 使用 `--dry-run` 預覽操作
- YOLO mode auto-confirms destructive actions / YOLO 模式自動確認危險操作

---

## License / 許可證

MIT

---

## Acknowledgments / 致謝

This project draws inspiration from:
- Claude Code CLI by Anthropic
- OpenClaw
- Nanobot
- MemPalace (memory system design)

All implementations are original / 所有實現均為原創
