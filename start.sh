#!/bin/bash
# Claw 启动脚本

set -e

# 检查 dist 目录是否存在
if [ ! -d "dist" ]; then
    echo "编译中..."
    npm run build
fi

# 运行 Claw
exec node dist/cli/index.js "$@"
