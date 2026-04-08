# 🐾 VIHIclaw

A local-first AI coding agent CLI tool / 本地優先的 AI 編程代理 CLI 工具

Developed by Software Development students at Fujian University (Fuckin U) / 由福建大學 (Fuckin U) 軟件開發學科學生開發

---

## Features / 特性

- 🤖 **Agent Loop**: State machine driven agent loop with tool calling / 狀態機驅動的代理循環，支持工具調用
- 🛠️ **Built-in Tools**: File read, write, edit, directory list, text search, shell execution / 內置工具：文件讀取、寫入、編輯、目錄列表、文本搜索、Shell 執行
- 💬 **Interactive REPL**: Terminal-based chat interface / 基於終端的交互式對話界面
- 💾 **Session Management**: Automatic conversation persistence to local JSONL / 會話管理：自動持久化對話到本地 JSONL
- 🔌 **Multi-Provider**: Anthropic Claude, OpenAI GPT, Local models / 多提供者支持：Anthropic Claude、OpenAI GPT、本地模型
- 🛡️ **Safety First**: Command whitelist, dry-run mode, path protection / 安全第一：命令白名單、模擬運行模式、路徑保護
- 📝 **Structured Logging**: Console + file dual logging / 結構化日誌：控制台 + 文件雙重日誌
- ⚡ **Startup Profiling**: Optional performance analysis / 啟動性能分析：可選的性能分析功能

---

## Installation / 安裝

```bash
# Clone repository / 克隆倉庫
cd vihiclaw

# Install dependencies / 安裝依賴
npm install

# Build / 編譯
npm run build

# Link globally (optional) / 全局鏈接（可選）
npm link
```

---

## Configuration / 配置

Create `.env` file or set environment variables / 創建 `.env` 文件或設置環境變量：

```bash
# LLM Provider Configuration / LLM 提供者配置
CLAW_PROVIDER=anthropic
CLAW_MODEL=claude-sonnet-4-6
CLAW_API_KEY=your_api_key_here

# Optional: Custom API endpoint for local models / 可選：本地模型自定義 API 地址
# CLAW_BASE_URL=http://localhost:11434/v1

# Performance profiling / 性能分析
# CLAW_PROFILE_STARTUP=1
```

Or create config file at `~/.claw/config.json` / 或在 `~/.claw/config.json` 創建配置文件：

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "apiKey": "your_api_key_here"
}
```

---

## Usage / 使用方法

### Start REPL / 啟動交互式對話

```bash
# Interactive chat / 交互式對話
vihiclaw

# Or explicitly / 或明確指定
vihiclaw chat
```

### Single Question / 單次提問

```bash
vihiclaw ask "Create a simple Express server / 創建一個簡單的 Express 服務器"
```

### CLI Options / 命令行選項

```bash
vihiclaw --help

Options:
  -V, --version                    Show version / 顯示版本
  -p, --provider <provider>        LLM provider / LLM 提供者
  -m, --model <model>              Model name / 模型名稱
  -k, --api-key <key>              API key / API 密鑰
  --dry-run                        Dry run mode / 模擬運行模式
  --session-dir <dir>              Session directory / 會話目錄
  --log-dir <dir>                  Log directory / 日誌目錄
  --log-level <level>              Log level / 日誌級別
  --no-stream                      Disable streaming / 禁用流式響應
  -h, --help                       Display help / 顯示幫助
```

### REPL Commands / REPL 命令

- `/help` - Show help / 顯示幫助
- `/tools` - List available tools / 列出可用工具
- `/config` - Show current configuration / 顯示當前配置
- `/dryrun` - Toggle dry-run mode / 切換模擬運行模式
- `/clear` - Clear conversation context / 清除對話上下文
- `exit` or `quit` - Exit REPL / 退出 REPL

---

## Available Tools / 可用工具

| Tool / 工具 | Function / 功能 | Safety / 安全級別 |
|-------------|-----------------|-------------------|
| `read_file` | Read file content / 讀取文件內容 | safe |
| `write_file` | Write/overwrite file / 寫入/覆蓋文件 | confirm |
| `edit_file` | Text edit (diff-style) / 文本編輯（diff 風格） | confirm |
| `list_dir` | List directory contents / 列出目錄內容 | safe |
| `search_text` | Text search (regex support) / 文本搜索（支持正則） | safe |
| `run_shell` | Execute shell command / 執行 shell 命令 | confirm |

---

## Project Structure / 項目結構

```
src/
  cli/           # CLI entry, REPL, single command / CLI 入口、REPL、單次命令
  agent/         # Agent loop core / 代理循環核心
  tools/         # Tool implementations / 工具實現
  providers/     # LLM providers / LLM 提供者
  session/       # Session management / 會話管理
  context/       # Context builder / 上下文構建
  config/        # Configuration management / 配置管理
  utils/         # Utilities / 工具函數
  types/         # Type definitions / 類型定義
```

---

## Tech Stack / 技術棧

- TypeScript 5.x
- Node.js 18+
- Anthropic SDK
- Commander.js
- Chalk
- Zod

---

## Development / 開發

```bash
# Development mode (auto-compile) / 開發模式（自動編譯）
npm run dev

# Run tests / 運行測試
npm test

# Clean build output / 清理編譯輸出
npm run clean
```

---

## Safety Notes / 安全說明

- Shell commands have whitelist restrictions / Shell 命令有白名單限制
- File edit operations create backups / 文件編輯操作會創建備份
- Sensitive paths (.env, .ssh, etc.) are blocked by default / 敏感路徑（.env、.ssh 等）默認被阻止
- Use `--dry-run` to preview actions / 使用 `--dry-run` 預覽操作

---

## License / 許可證

MIT

---

## Acknowledgments / 致謝

This project draws inspiration from:
- Claude Code CLI by Anthropic
- OpenClaw
- Nanobot

All implementations are original / 所有實現均為原創
