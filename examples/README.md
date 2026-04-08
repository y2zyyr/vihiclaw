# Claw 示例任务

本目录包含可用于测试 Claw 功能的示例任务。

## 运行示例

```bash
# 启动 Claw REPL
claw

# 然后在 REPL 中输入示例任务
```

## 示例列表

### 1. 文件操作 (file-operations.md)

演示文件读写、目录列表、搜索和编辑功能。

### 2. 代码生成 (code-generation.md)

演示代码生成和项目脚手架功能。

### 3. 代码分析 (code-analysis.md)

演示代码分析和重构功能。

## Dry Run 模式

使用 `--dry-run` 标志可以在不实际执行操作的情况下预览：

```bash
claw --dry-run ask "创建一个测试文件"
```
