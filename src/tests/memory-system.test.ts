/**
 * Memory System Test / 記憶系統測試
 * Phase 2 Round 6 - Long-term Memory inspired by MemPalace analysis / 受 MemPalace 啟發的長期記憶
 */

import { MemoryStore } from '../memory/store.js';
import { MemoryManager } from '../memory/manager.js';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ToolExecutionTrace } from '../agent/types.js';

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}: ${error}`);
    return false;
  }
}

async function main() {
  console.log('\n🧠 Memory System Test Suite / 記憶系統測試套件\n');

  // Create temp directory / 創建臨時目錄
  const tmpDir = mkdtempSync(join(tmpdir(), 'vihiclaw-memory-test-'));

  let passed = 0;
  let failed = 0;

  // Test 1: MemoryStore basic operations / 測試 1：記憶存儲基本操作
  if (await runTest('MemoryStore initialize and add / 記憶存儲初始化和添加', async () => {
    const store = new MemoryStore(join(tmpDir, 'store1'));
    await store.initialize();

    const item = await store.add({
      sourceType: 'conversation',
      contentRaw: 'Test conversation content',
      timestamp: new Date().toISOString(),
      actor: 'user',
      provenance: 'test',
      ingestRunId: 'test-run-1',
      sessionId: 'session-1',
    });

    if (!item.id) throw new Error('Item should have id');
    if (!item.hash) throw new Error('Item should have hash');

    const retrieved = await store.get(item.id);
    if (!retrieved) throw new Error('Should retrieve item');
    if (retrieved.contentRaw !== 'Test conversation content') throw new Error('Content mismatch');
  })) passed++; else failed++;

  // Test 2: MemoryStore search / 測試 2：記憶存儲搜索
  if (await runTest('MemoryStore search by query / 記憶存儲按查詢搜索', async () => {
    const store = new MemoryStore(join(tmpDir, 'store2'));
    await store.initialize();

    await store.add({
      sourceType: 'conversation',
      contentRaw: 'The quick brown fox',
      timestamp: new Date().toISOString(),
      actor: 'user',
      provenance: 'test',
      ingestRunId: 'test-run-2',
      sessionId: 'session-2',
    });

    await store.add({
      sourceType: 'tool_execution',
      contentRaw: 'The lazy dog sleeps',
      timestamp: new Date().toISOString(),
      actor: 'assistant',
      provenance: 'test',
      ingestRunId: 'test-run-2',
      sessionId: 'session-2',
    });

    const results = await store.search({ query: 'fox' });
    if (results.length !== 1) throw new Error(`Expected 1 result, got ${results.length}`);
    if (!results[0].item.contentRaw.includes('fox')) throw new Error('Wrong result');
  })) passed++; else failed++;

  // Test 3: MemoryStore search by source type / 測試 3：按來源類型搜索
  if (await runTest('MemoryStore search by source type / 記憶存儲按來源類型搜索', async () => {
    const store = new MemoryStore(join(tmpDir, 'store3'));
    await store.initialize();

    await store.add({
      sourceType: 'conversation',
      contentRaw: 'Conversation 1',
      timestamp: new Date().toISOString(),
      actor: 'user',
      provenance: 'test',
      ingestRunId: 'test-run-3',
      sessionId: 'session-3',
    });

    await store.add({
      sourceType: 'tool_execution',
      contentRaw: 'Tool result 1',
      timestamp: new Date().toISOString(),
      actor: 'assistant',
      provenance: 'test',
      ingestRunId: 'test-run-3',
      sessionId: 'session-3',
    });

    const results = await store.search({ sourceTypes: ['tool_execution'] });
    if (results.length !== 1) throw new Error(`Expected 1 result, got ${results.length}`);
    if (results[0].item.sourceType !== 'tool_execution') throw new Error('Wrong source type');
  })) passed++; else failed++;

  // Test 4: MemoryManager capture tool execution / 測試 4：記憶管理器捕獲工具執行
  if (await runTest('MemoryManager capture tool execution / 記憶管理器捕獲工具執行', async () => {
    const manager = new MemoryManager({
      memoryDir: join(tmpDir, 'manager1'),
      autoCapture: true,
      captureToolExecutions: true,
      captureConversations: false,
    });
    await manager.initialize();

    const trace: ToolExecutionTrace = {
      toolCallId: 'call-123',
      toolName: 'read_file',
      startTime: Date.now(),
      status: 'success',
      duration: 100,
    };

    await manager.captureToolExecution(
      'session-test',
      'read_file',
      { path: 'test.txt' },
      'File content here',
      trace
    );

    const memories = await manager.getSessionMemories('session-test');
    if (memories.length !== 1) throw new Error(`Expected 1 memory, got ${memories.length}`);
    if (!memories[0].contentRaw.includes('read_file')) throw new Error('Should contain tool name');
  })) passed++; else failed++;

  // Test 5: MemoryManager capture conversation / 測試 5：記憶管理器捕獲對話
  if (await runTest('MemoryManager capture conversation / 記憶管理器捕獲對話', async () => {
    const manager = new MemoryManager({
      memoryDir: join(tmpDir, 'manager2'),
      autoCapture: true,
      captureToolExecutions: false,
      captureConversations: true,
    });
    await manager.initialize();

    await manager.captureConversation('session-test', 'user', 'Hello AI');
    await manager.captureConversation('session-test', 'assistant', 'Hello user');

    const memories = await manager.getSessionMemories('session-test');
    if (memories.length !== 2) throw new Error(`Expected 2 memories, got ${memories.length}`);
  })) passed++; else failed++;

  // Test 6: Context pack assembly / 測試 6：上下文包組裝
  if (await runTest('MemoryManager assemble context pack / 記憶管理器組裝上下文包', async () => {
    const manager = new MemoryManager({
      memoryDir: join(tmpDir, 'manager3'),
      autoCapture: true,
      captureToolExecutions: true,
      captureConversations: true,
    });
    await manager.initialize();

    // Add some memories / 添加一些記憶
    await manager.captureConversation('pack-session', 'user', 'How do I fix this bug?');

    const trace: ToolExecutionTrace = {
      toolCallId: 'call-1',
      toolName: 'search_text',
      startTime: Date.now(),
      status: 'success',
    };
    await manager.captureToolExecution('pack-session', 'search_text', { pattern: 'bug' }, 'Found 3 results', trace);

    const pack = await manager.assembleContextPack('pack-session', 'coding', 'Fix the bug');

    if (pack.packType !== 'coding') throw new Error('Wrong pack type');
    if (pack.targetTask !== 'Fix the bug') throw new Error('Wrong target task');
    if (pack.rawFragments.length === 0) throw new Error('Should have raw fragments');
  })) passed++; else failed++;

  // Test 7: Memory stats / 測試 7：記憶統計
  if (await runTest('MemoryManager get stats / 記憶管理器獲取統計', async () => {
    const manager = new MemoryManager({
      memoryDir: join(tmpDir, 'manager4'),
      autoCapture: true,
      captureToolExecutions: true,
      captureConversations: true,
    });
    await manager.initialize();

    await manager.captureConversation('stats-session', 'user', 'Test');

    const stats = await manager.getStats();
    if (stats.totalItems < 1) throw new Error('Should have at least 1 item');
  })) passed++; else failed++;

  console.log(`\n📊 Results / 結果: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '✅ All tests passed / 所有測試通過' : '❌ Some tests failed / 部分測試失敗');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test suite failed / 測試套件失敗:', error);
  process.exit(1);
});
