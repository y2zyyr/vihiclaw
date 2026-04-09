/**
 * Session Exporter Test / 會話導出器測試
 * Phase 2 Round 4 - Surpass Point #3: Session Export & Portability / 第 3 個超越點：會話導出與可移植性
 */

import { exportSession, suggestExportFilename } from '../session/exporter.js';
import { SessionManager } from '../session/manager.js';
import { mkdtempSync, readFileSync, existsSync } from 'fs';
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

async function main() {
  console.log('\n📦 Session Exporter Test Suite / 會話導出器測試套件\n');

  // Create temp session directory / 創建臨時會話目錄
  const tmpDir = mkdtempSync(join(tmpdir(), 'vihiclaw-export-test-'));
  const exportDir = mkdtempSync(join(tmpdir(), 'vihiclaw-exports-'));
  const sessionManager = new SessionManager(tmpDir);
  await sessionManager.initialize();

  // Create a session with messages / 創建帶消息的會話
  const session = await sessionManager.create();
  await sessionManager.addMessage(session.id, { role: 'user', content: 'Hello' });
  await sessionManager.addMessage(session.id, { role: 'assistant', content: 'Hi there!' });
  await sessionManager.addMessage(session.id, { role: 'user', content: 'How are you?' });

  let passed = 0;
  let failed = 0;

  // Test JSON export / 測試 JSON 導出
  if (await runTest('export to JSON / 導出為 JSON', async () => {
    const outputPath = join(exportDir, 'test-export.json');
    const result = await exportSession(sessionManager, session.id, {
      format: 'json',
      outputPath,
      includeMetadata: true,
    });
    if (!result.success) throw new Error(result.error);
    if (!existsSync(outputPath)) throw new Error('File not created');
    if (result.messageCount !== 3) throw new Error(`Expected 3 messages, got ${result.messageCount}`);

    const content = readFileSync(outputPath, 'utf-8');
    const data = JSON.parse(content);
    if (!data.session) throw new Error('Missing session data');
    if (data.session.messages.length !== 3) throw new Error('Wrong message count in export');
  })) passed++; else failed++;

  // Test Markdown export / 測試 Markdown 導出
  if (await runTest('export to Markdown / 導出為 Markdown', async () => {
    const outputPath = join(exportDir, 'test-export.md');
    const result = await exportSession(sessionManager, session.id, {
      format: 'markdown',
      outputPath,
      includeMetadata: true,
    });
    if (!result.success) throw new Error(result.error);
    if (!existsSync(outputPath)) throw new Error('File not created');

    const content = readFileSync(outputPath, 'utf-8');
    if (!content.includes('# VIHIclaw Session Export')) throw new Error('Missing header');
    if (!content.includes('👤 User')) throw new Error('Missing user marker');
    if (!content.includes('🤖 Assistant')) throw new Error('Missing assistant marker');
    if (!content.includes('Hello')) throw new Error('Missing message content');
  })) passed++; else failed++;

  // Test export without metadata / 測試不包含元數據的導出
  if (await runTest('export without metadata / 導出無元數據', async () => {
    const outputPath = join(exportDir, 'test-no-meta.json');
    const result = await exportSession(sessionManager, session.id, {
      format: 'json',
      outputPath,
      includeMetadata: false,
    });
    if (!result.success) throw new Error(result.error);

    const content = readFileSync(outputPath, 'utf-8');
    const data = JSON.parse(content);
    if (data.session.metadata) throw new Error('Should not have metadata');
  })) passed++; else failed++;

  // Test export non-existent session / 測試導出不存在的會話
  if (await runTest('export non-existent session / 導出不存在的會話', async () => {
    const result = await exportSession(sessionManager, 'non-existent-id', {
      format: 'json',
      outputPath: join(exportDir, 'fake.json'),
    });
    if (result.success) throw new Error('Should fail for non-existent session');
    if (!result.error?.includes('not found')) throw new Error('Wrong error message');
  })) passed++; else failed++;

  // Test filename suggestion / 測試文件名建議
  if (await runTest('suggestExportFilename / 文件名建議', async () => {
    const jsonName = suggestExportFilename('test-session-123', 'json');
    if (!jsonName.endsWith('.json')) throw new Error('Should end with .json');
    if (!jsonName.includes('test-ses')) throw new Error('Should include short session ID');
    if (!jsonName.startsWith('vihiclaw-session-')) throw new Error('Should have correct prefix');

    const mdName = suggestExportFilename('test-session-123', 'markdown');
    if (!mdName.endsWith('.md')) throw new Error('Should end with .md');
  })) passed++; else failed++;

  // Test Markdown includes tool calls / 測試 Markdown 包含工具調用
  await sessionManager.addMessage(session.id, {
    role: 'assistant',
    content: 'Let me check that',
    toolCalls: [{ id: 'call-1', name: 'read_file', arguments: { path: 'test.txt' } }],
  });

  if (await runTest('markdown includes tool calls / Markdown 包含工具調用', async () => {
    const outputPath = join(exportDir, 'test-tools.md');
    const result = await exportSession(sessionManager, session.id, {
      format: 'markdown',
      outputPath,
    });
    if (!result.success) throw new Error(result.error);

    const content = readFileSync(outputPath, 'utf-8');
    if (!content.includes('Tool Calls')) throw new Error('Missing tool calls section');
    if (!content.includes('read_file')) throw new Error('Missing tool name');
  })) passed++; else failed++;

  // Cleanup / 清理
  // Note: Temp dirs will be cleaned by OS eventually

  console.log(`\n📊 Results / 結果: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '✅ All tests passed / 所有測試通過' : '❌ Some tests failed / 部分測試失敗');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test suite failed / 測試套件失敗:', error);
  process.exit(1);
});
