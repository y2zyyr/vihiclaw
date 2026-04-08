#!/usr/bin/env node
// 工具测试脚本

import { createDefaultRegistry } from './dist/tools/index.js';
import { FileLogger } from './dist/utils/logger.js';

async function testTools() {
  console.log('🧪 Testing Claw Tools\n');

  const logger = new FileLogger('debug');
  const registry = createDefaultRegistry();

  const testContext = {
    sessionId: 'test-session',
    logger,
    dryRun: false,
    workingDir: process.cwd(),
  };

  const tests = [];

  // Test 1: write_file
  tests.push(async () => {
    console.log('Test 1: write_file');
    const tool = registry.get('write_file');
    const result = await tool.execute(
      { path: 'test-output.txt', content: 'Hello from Claw!' },
      testContext
    );
    console.log('  Result:', result.success ? '✅ PASS' : '❌ FAIL');
    if (!result.success) console.log('  Error:', result.error);
    return result.success;
  });

  // Test 2: read_file
  tests.push(async () => {
    console.log('Test 2: read_file');
    const tool = registry.get('read_file');
    const result = await tool.execute(
      { path: 'test-output.txt' },
      testContext
    );
    console.log('  Result:', result.success ? '✅ PASS' : '❌ FAIL');
    if (!result.success) console.log('  Error:', result.error);
    if (result.success && result.content === 'Hello from Claw!') {
      console.log('  Content match: ✅');
    } else if (result.success) {
      console.log('  Content mismatch: ❌');
      console.log('  Expected: "Hello from Claw!"');
      console.log('  Got:', result.content);
    }
    return result.success;
  });

  // Test 3: list_dir
  tests.push(async () => {
    console.log('Test 3: list_dir');
    const tool = registry.get('list_dir');
    const result = await tool.execute(
      { path: '.' },
      testContext
    );
    console.log('  Result:', result.success ? '✅ PASS' : '❌ FAIL');
    if (!result.success) console.log('  Error:', result.error);
    if (result.success && result.content.includes('test-output.txt')) {
      console.log('  Contains test file: ✅');
    } else if (result.success) {
      console.log('  Missing test file: ❌');
    }
    return result.success;
  });

  // Test 4: search_text
  tests.push(async () => {
    console.log('Test 4: search_text');
    const tool = registry.get('search_text');
    const result = await tool.execute(
      { pattern: 'Claw', path: '.' },
      testContext
    );
    console.log('  Result:', result.success ? '✅ PASS' : '❌ FAIL');
    if (!result.success) console.log('  Error:', result.error);
    if (result.success && result.content.includes('test-output.txt')) {
      console.log('  Found in file: ✅');
    } else if (result.success) {
      console.log('  Not found: ❌');
    }
    return result.success;
  });

  // Test 5: edit_file
  tests.push(async () => {
    console.log('Test 5: edit_file');
    const tool = registry.get('edit_file');
    const result = await tool.execute(
      { path: 'test-output.txt', oldText: 'Hello', newText: 'Hi' },
      testContext
    );
    console.log('  Result:', result.success ? '✅ PASS' : '❌ FAIL');
    if (!result.success) console.log('  Error:', result.error);

    // Verify edit
    const readTool = registry.get('read_file');
    const readResult = await readTool.execute(
      { path: 'test-output.txt' },
      testContext
    );
    if (readResult.success && readResult.content === 'Hi from Claw!') {
      console.log('  Edit verified: ✅');
    } else if (readResult.success) {
      console.log('  Edit failed: ❌');
      console.log('  Content:', readResult.content);
    }
    return result.success;
  });

  // Test 6: run_shell
  tests.push(async () => {
    console.log('Test 6: run_shell');
    const tool = registry.get('run_shell');
    const result = await tool.execute(
      { command: 'echo "Shell test"' },
      { ...testContext, allowedShellCommands: ['echo'] }
    );
    console.log('  Result:', result.success ? '✅ PASS' : '❌ FAIL');
    if (!result.success) console.log('  Error:', result.error);
    if (result.success && result.content.includes('Shell test')) {
      console.log('  Output verified: ✅');
    }
    return result.success;
  });

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const success = await test();
      if (success) passed++;
      else failed++;
    } catch (error) {
      console.log('  Exception:', error.message);
      failed++;
    }
    console.log();
  }

  // Cleanup
  try {
    const { execSync } = await import('child_process');
    execSync('rm -f test-output.txt test-output.txt.backup');
  } catch {
    // ignore cleanup errors
  }

  console.log('='.repeat(40));
  console.log(`Total: ${tests.length}, Passed: ${passed}, Failed: ${failed}`);
  console.log('='.repeat(40));

  process.exit(failed > 0 ? 1 : 0);
}

testTools().catch(console.error);
