# Changelog

## [0.1.0] - 2024-04-08

### 新增

- 初始版本发布
- CLI 入口和 REPL 交互式对话
- Agent Loop（状态机驱动）
- 内置工具系统：
  - `read_file` - 读取文件内容
  - `write_file` - 写入文件
  - `edit_file` - 文本编辑
  - `list_dir` - 列出目录
  - `search_text` - 文本搜索
  - `run_shell` - 执行 shell 命令
- 多 Provider 支持：
  - Anthropic Claude
  - OpenAI GPT
  - 本地模型（OpenAI-compatible）
- 会话管理（JSONL 持久化）
- 配置系统（文件 + 环境变量 + 命令行）
- 结构化日志
- Dry-run 模式

### 架构

- 依赖注入设计
- 轻量级消息总线
- 类型安全（TypeScript）
- 扁平配置层级

## 参考研究

本项目参考了以下开源项目的设计思想：

- **Claude Code CLI**: CLI 入口快速路径、工具化架构、状态管理
- **OpenClaw**: Agent Loop 结构、Tool 抽象层、事件驱动
- **Nanobot**: 轻量级设计、消息总线、配置即代码

所有实现均为原创，仅借鉴设计思想。
