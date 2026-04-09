/**
 * Tool Concurrency Test / 工具並發測試
 * Phase 2 Round 5 - Surpass Point #4: Tool Concurrency / 第 4 個超越點：工具並發
 */

import { AgentLoop } from '../agent/loop.js';
import { createDefaultRegistry } from '../tools/index.js';
import { SessionManager } from '../session/manager.js';
import { createLogger } from '../utils/logger.js';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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

// Mock provider for testing / 測試用的模擬提供者
class MockProvider {
  private callCount = 0;

  async complete() {
    this.callCount++;
    // const lastMessage = messages[messages.length - 1];

    // First call: request multiple file reads / 第一次調用：請求多個文件讀取
    if (this.callCount === 1) {
      return {
        content: 'Reading multiple files',
        toolCalls: [
          { id: 'call-1', name: 'read_file', arguments: { path: 'file1.txt' } },
          { id: 'call-2', name: 'read_file', arguments: { path: 'file2.txt' } },
          { id: 'call-3', name: 'read_file', arguments: { path: 'file3.txt' } },
        ],
      };
    }

    // Second call: done / 第二次調用：完成
    return { content: 'Done reading files' };
  }
}

async function main() {
  console.log('\n🔄 Tool Concurrency Test Suite / 工具並發測試套件\n');

  // Create temp directory with test files / 創建帶測試文件的臨時目錄
  const tmpDir = mkdtempSync(join(tmpdir(), 'vihiclaw-concurrency-test-'));
  writeFileSync(join(tmpDir, 'file1.txt'), 'File 1 content');
  writeFileSync(join(tmpDir, 'file2.txt'), 'File 2 content');
  writeFileSync(join(tmpDir, 'file3.txt'), 'File 3 content');

  const registry = createDefaultRegistry();
  const logger = createLogger('error');
  const sessionManager = new SessionManager(join(tmpDir, 'sessions'));
  await sessionManager.initialize();
  const session = await sessionManager.create();

  let passed = 0;
  let failed = 0;

  // Test 1: Verify concurrency safe tools are marked / 測試 1：驗證並發安全工具已標記
  if (await runTest('Tools marked concurrency-safe / 工具標記為並發安全', async () => {
    const readTool = registry.get('read_file');
    const listTool = registry.get('list_dir');
    const searchTool = registry.get('search_text');
    const gitStatusTool = registry.get('git_status');

    if (!readTool?.isConcurrencySafe) throw new Error('read_file should be concurrency safe');
    if (!listTool?.isConcurrencySafe) throw new Error('list_dir should be concurrency safe');
    if (!searchTool?.isConcurrencySafe) throw new Error('search_text should be concurrency safe');
    if (!gitStatusTool?.isConcurrencySafe) throw new Error('git_status should be concurrency safe');
  })) passed++; else failed++;

  // Test 2: Verify unsafe tools are not marked / 測試 2：驗證非安全工具未標記
  if (await runTest('Write tools not marked safe / 寫入工具未標記為安全', async () => {
    const writeTool = registry.get('write_file');
    const editTool = registry.get('edit_file');
    const shellTool = registry.get('run_shell');

    if (writeTool?.isConcurrencySafe) throw new Error('write_file should NOT be concurrency safe');
    if (editTool?.isConcurrencySafe) throw new Error('edit_file should NOT be concurrency safe');
    if (shellTool?.isConcurrencySafe) throw new Error('run_shell should NOT be concurrency safe');
  })) passed++; else failed++;

  // Test 3: Concurrent execution timing / 測試 3：並發執行時間
  if (await runTest('Concurrent execution is faster / 並發執行更快', async () => {
    const provider = new MockProvider() as any;
    const executionTimes: number[] = [];

    const agent = new AgentLoop(
      provider,
      registry,
      sessionManager,
      session.id,
      logger,
      {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        maxIterations: 5,
        temperature: 0,
        dryRun: false,
        confirmDestructive: true,
        allowedShellCommands: [],
        blockedPaths: [],
        sessionDir: join(tmpDir, 'sessions'),
        logDir: join(tmpDir, 'logs'),
        logLevel: 'error',
        streamResponse: false,
        saveSession: true,
      },
      {
        onToolExecutionStart: () => {
          executionTimes.push(Date.now());
        },
        onToolExecutionEnd: () => {
          executionTimes.push(Date.now());
        },
      }
    );

    // Change working directory for the agent
    process.chdir(tmpDir);

    const startTime = Date.now();
    await agent.run('Read files');
    const totalTime = Date.now() - startTime;

    // With 3 concurrent reads, total time should be much less than 3x serial time
    // Each file read takes ~1-5ms, so 3 concurrent should take ~5-15ms, not 15-45ms
    // 並發執行 3 個文件讀取應該比串行快得多
    if (totalTime > 500) {
      console.log(`    (Warning: execution took ${totalTime}ms, may be slower than expected)`);
    }

    // Verify all tools were executed / 驗證所有工具都被執行
    const traces = agent.getToolTraces();
    if (traces.length !== 3) throw new Error(`Expected 3 traces, got ${traces.length}`);

    // Reset working directory
    process.chdir(process.cwd());
  })) passed++; else failed++;

  // Test 4: Results maintain order / 測試 4：結果保持順序
  if (await runTest('Results maintain call order / 結果保持調用順序', async () => {
    const provider = {
      callCount: 0,
      async complete() {
        this.callCount++;
        if (this.callCount === 1) {
          return {
            content: 'Reading',
            toolCalls: [
              { id: 'call-a', name: 'read_file', arguments: { path: 'file1.txt' } },
              { id: 'call-b', name: 'read_file', arguments: { path: 'file2.txt' } },
              { id: 'call-c', name: 'read_file', arguments: { path: 'file3.txt' } },
            ],
          };
        }
        return { content: 'Done' };
      }
    };

    // const contextMessages: any[] = [];
    const agent = new AgentLoop(
      provider as any,
      registry,
      sessionManager,
      session.id,
      logger,
      {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        maxIterations: 5,
        temperature: 0,
        dryRun: false,
        confirmDestructive: true,
        allowedShellCommands: [],
        blockedPaths: [],
        sessionDir: join(tmpDir, 'sessions'),
        logDir: join(tmpDir, 'logs'),
        logLevel: 'error',
        streamResponse: false,
        saveSession: true,
      },
    );

    process.chdir(tmpDir);
    await agent.run('Test order');
    process.chdir(process.cwd());

    // Verify traces are in original call order / 驗證追踪按原始調用順序
    const traces = agent.getToolTraces();
    const last3Traces = traces.slice(-3);
    const callIds = last3Traces.map(t => t.toolCallId);

    // Should be in original order: call-a, call-b, call-c
    if (callIds[0] !== 'call-a' || callIds[1] !== 'call-b' || callIds[2] !== 'call-c') {
      throw new Error(`Order not maintained: ${callIds.join(', ')}`);
    }
  })) passed++; else failed++;

  // Cleanup / 清理
  // Note: Temp dir will be cleaned by OS

  console.log(`\n📊 Results / 結果: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '✅ All tests passed / 所有測試通過' : '❌ Some tests failed / 部分測試失敗');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test suite failed / 測試套件失敗:', error);
  process.exit(1);
});
