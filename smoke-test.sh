#!/bin/bash
# Smoke Test Script / 煙霧測試腳本
# Comprehensive end-to-end test / 綜合端到端測試

set -e

echo "🧪 VIHIclaw Smoke Test / 煙霧測試"
echo "===================================="
echo ""

# Colors / 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Test helper / 測試輔助函數
run_test() {
    local name="$1"
    local cmd="$2"
    echo -n "Testing: $name ... "
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
        return 1
    fi
}

# 1. Build Test / 編譯測試
echo "📦 Phase 1: Build Tests / 編譯測試"
echo "-----------------------------------"
run_test "npm install" "npm install"
run_test "npm run build" "npm run build"
echo ""

# 2. CLI Basic Tests / CLI 基礎測試
echo "🔧 Phase 2: CLI Basic Tests / CLI 基礎測試"
echo "-------------------------------------------"
run_test "CLI --version" "node dist/cli/index.js --version"
run_test "CLI --help" "node dist/cli/index.js --help"
run_test "CLI session list" "node dist/cli/index.js session list"
echo ""

# 3. Tool Tests / 工具測試
echo "🛠️ Phase 3: Tool Tests / 工具測試"
echo "----------------------------------"
run_test "Tool: write_file" "node -e \"const {writeFileTool} = require('./dist/tools/write.js'); writeFileTool.execute({path: 'test-smoke.txt', content: 'Hello VIHIclaw'}, {sessionId: 'test', logger: {info:()=>{}, debug:()=>{}}, dryRun: false, workingDir: '.'}).then(r => process.exit(r.success ? 0 : 1))\""
run_test "Tool: read_file" "node -e \"const {readFileTool} = require('./dist/tools/read.js'); readFileTool.execute({path: 'test-smoke.txt'}, {sessionId: 'test', logger: {info:()=>{}, debug:()=>{}}, dryRun: false, workingDir: '.'}).then(r => process.exit(r.success ? 0 : 1))\""
run_test "Tool: list_dir" "node -e \"const {listDirTool} = require('./dist/tools/dir.js'); listDirTool.execute({path: '.'}, {sessionId: 'test', logger: {info:()=>{}, debug:()=>{}}, dryRun: false, workingDir: '.'}).then(r => process.exit(r.success ? 0 : 1))\""
run_test "Tool: search_text" "node -e \"const {searchTextTool} = require('./dist/tools/search.js'); searchTextTool.execute({pattern: 'VIHIclaw', path: '.'}, {sessionId: 'test', logger: {info:()=>{}, debug:()=>{}}, dryRun: false, workingDir: '.'}).then(r => process.exit(r.success ? 0 : 1))\""
echo ""

# 4. Integration Test / 集成測試
echo "🔗 Phase 4: Integration Tests / 集成測試"
echo "-----------------------------------------"

# Test config loading / 測試配置加載
run_test "Config loading" "node -e \"const {loadConfig} = require('./dist/config/loader.js'); loadConfig({}).then(() => process.exit(0)).catch(() => process.exit(1))\""

# Test session manager / 測試會話管理
run_test "Session manager" "node -e \"const {SessionManager} = require('./dist/session/manager.js'); const sm = new SessionManager('/tmp/vihiclaw-test-sessions'); sm.initialize().then(() => sm.create()).then(() => process.exit(0)).catch(() => process.exit(1))\""

echo ""

# 5. Cleanup / 清理
echo "🧹 Phase 5: Cleanup / 清理"
echo "---------------------------"
rm -f test-smoke.txt test-smoke.txt.backup
run_test "Cleanup test files" "test ! -f test-smoke.txt"
echo ""

# Summary / 匯總
echo "===================================="
echo "📊 Test Summary / 測試匯總"
echo "===================================="
echo -e "Passed / 通過: ${GREEN}$PASS${NC}"
echo -e "Failed / 失敗: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! / 所有測試通過！${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Some tests failed / 部分測試失敗${NC}"
    exit 1
fi
