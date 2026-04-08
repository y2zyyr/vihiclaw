# 🐾 Claw

一个本地优先的 AI coding agent CLI 工具。

## 特性

- 🤖 **Agent Loop**: 状态机驱动的智能体循环，支持工具调用
- 🛠️ **内置工具**: 文件读取、写入、编辑、目录列表、文本搜索、Shell 执行
- 💬 **REPL 交互**: 交互式对话界面
- 💾 **会话管理**: 自动保存对话历史到本地 JSONL 文件
- 🔌 **多 Provider 支持**: Anthropic Claude、OpenAI GPT、本地模型
- 🛡️ **安全设计**: 命令白名单、dry-run 模式、路径保护
- 📝 **结构化日志**: 控制台 + 文件双重日志

## 安装

```bash
# 克隆仓库
cd claw

# 安装依赖
npm install

# 编译
npm run build

# 链接到全局（可选）
npm link
```

## 配置

创建 `.env` 文件或设置环境变量：

```bash
# LLM Provider 配置
CLAW_PROVIDER=anthropic
CLAW_MODEL=claude-sonnet-4-6
CLAW_API_KEY=your_api_key_here

# 可选：自定义 API 地址（用于本地模型）
# CLAW_BASE_URL=http://localhost:11434/v1
```

或者创建配置文件 `~/.claw/config.json`：

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "apiKey": "your_api_key_here"
}
```

## 使用方法

### 启动 REPL

```bash
# 交互式对话
claw

# 或明确指定
claw chat
```

### 单次提问

```bash
claw ask "创建一个简单的 Express 服务器"
```

### 命令行选项

```bash
claw --help

Options:
  -V, --version                    output the version number
  -p, --provider <provider>        LLM provider (anthropic, openai, local)
  -m, --model <model>              Model name
  -k, --api-key <key>              API key
  --dry-run                        Dry run mode (show actions without executing)
  --session-dir <dir>              Session directory
  --log-dir <dir>                  Log directory
  --log-level <level>              Log level (debug, info, warn, error)
  --no-stream                      Disable streaming responses
  -h, --help                       display help for command

Commands:
  chat                             Start interactive chat (REPL)
  ask <prompt>                     Ask a single question
  session                          Session management
  help [command]                   display help for command
```

### REPL 命令

在 REPL 中可以使用以下命令：

- `/help` - 显示帮助
- `/tools` - 列出可用工具
- `/config` - 显示当前配置
- `/dryrun` - 切换 dry-run 模式
- `/clear` - 清除对话上下文
- `exit` 或 `quit` - 退出

## 可用工具

| 工具名 | 功能 | 安全级别 |
|--------|------|----------|
| `read_file` | 读取文件内容 | safe |
| `write_file` | 写入/覆盖文件 | confirm |
| `edit_file` | 文本编辑（diff 风格） | confirm |
| `list_dir` | 列出目录内容 | safe |
| `search_text` | 文本搜索（支持正则） | safe |
| `run_shell` | 执行 shell 命令 | confirm |

## 示例任务

### 1. 读取文件

```
> 读取 README.md 文件的内容
```

### 2. 创建文件

```
> 创建一个 hello.js 文件，输出 "Hello World"
```

### 3. 搜索代码

```
> 在 src 目录中搜索所有使用 console.log 的地方
```

### 4. 执行命令

```
> 运行 ls -la 命令并显示结果
```

### 5. 编辑文件

```
> 在 hello.js 中将 "Hello World" 改为 "Hello Claw"
```

## 项目结构

```
src/
  cli/          - CLI 入口和 REPL
  agent/        - Agent 循环核心
  tools/        - 工具实现
  providers/    - LLM 提供者
  session/      - 会话管理
  context/      - 上下文构建
  config/       - 配置管理
  utils/        - 工具函数
```

## 技术栈

- TypeScript 5.x
- Node.js 18+
- Anthropic SDK
- Commander.js
- Chalk
- Zod

## 开发

```bash
# 开发模式（自动编译）
npm run dev

# 运行测试
npm test

# 清理编译输出
npm run clean
```

## 安全说明

- Shell 命令默认有白名单限制
- 文件编辑操作会创建备份
- 敏感路径（.env, .ssh 等）默认被阻止
- 使用 `--dry-run` 模式预览操作

## License

MIT
