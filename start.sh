#!/bin/bash
# VIHIclaw Startup Script / VIHIclaw 啟動腳本

set -e

# Check if dist directory exists / 檢查 dist 目錄是否存在
if [ ! -d "dist" ]; then
    echo "Building... / 編譯中..."
    npm run build
fi

# Run VIHIclaw / 運行 VIHIclaw
exec node dist/cli/index.js "$@"
