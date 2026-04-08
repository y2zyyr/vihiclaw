# Changelog / 變更記錄

## [0.1.0] - 2024-04-08

### Added / 新增

- Initial release / 初始版本發布
- CLI entry and REPL / CLI 入口和交互式對話
- Agent Loop (state machine driven) / 代理循環（狀態機驅動）
- Built-in tool system / 內置工具系統：
  - `read_file` - Read file content / 讀取文件內容
  - `write_file` - Write file / 寫入文件
  - `edit_file` - Text edit / 文本編輯
  - `list_dir` - List directory / 列出目錄
  - `search_text` - Text search / 文本搜索
  - `run_shell` - Execute shell command / 執行 shell 命令
- Multi-provider support / 多提供者支持：
  - Anthropic Claude / Anthropic Claude
  - OpenAI GPT / OpenAI GPT
  - Local models (OpenAI-compatible) / 本地模型（OpenAI 兼容）
- Session management (JSONL persistence) / 會話管理（JSONL 持久化）
- Configuration system / 配置系統
- Structured logging / 結構化日誌
- Dry-run mode / 模擬運行模式
- Startup profiling / 啟動性能分析

### Architecture / 架構

- Dependency injection design / 依賴注入設計
- Lightweight message bus / 輕量級消息總線
- Type safety (TypeScript) / 類型安全（TypeScript）
- Flat configuration hierarchy / 扁平配置層級

### Acknowledgments / 致謝

This project draws inspiration from:
- Claude Code CLI by Anthropic
- OpenClaw
- Nanobot

All implementations are original / 所有實現均為原創
