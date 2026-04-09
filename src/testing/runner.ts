/**
 * Test Runner / 測試運行器
 * Phase 2 Round 21 - Lightweight test framework / 輕量級測試框架
 */

export interface TestCase {
  name: string;
  fn: () => Promise<void> | void;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeEach?: () => Promise<void> | void;
  afterEach?: () => Promise<void> | void;
}

export class TestRunner {
  private suites: TestSuite[] = [];

  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }

  async run(): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];

    for (const suite of this.suites) {
      console.log(`\n📁 ${suite.name}`);

      for (const test of suite.tests) {
        if (suite.beforeEach) {
          await suite.beforeEach();
        }

        const start = Date.now();
        let passed = true;
        let error: string | undefined;

        try {
          await test.fn();
        } catch (e) {
          passed = false;
          error = String(e);
        }

        const duration = Date.now() - start;

        if (suite.afterEach) {
          await suite.afterEach();
        }

        results.push({
          name: `${suite.name} › ${test.name}`,
          passed,
          error,
          duration,
        });

        console.log(`  ${passed ? '✓' : '✗'} ${test.name} (${duration}ms)`);
      }
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    return {
      total: results.length,
      passed,
      failed,
      results,
    };
  }
}

// Global test functions / 全局測試函數
export function describe(name: string, fn: () => void): void {
  const suite: TestSuite = { name, tests: [] };
  currentSuite = suite;
  fn();
  runner.addSuite(suite);
  currentSuite = null;
}

export function it(name: string, fn: () => Promise<void> | void): void {
  if (currentSuite) {
    currentSuite.tests.push({ name, fn });
  }
}

export function beforeEach(fn: () => Promise<void> | void): void {
  if (currentSuite) {
    currentSuite.beforeEach = fn;
  }
}

export function afterEach(fn: () => Promise<void> | void): void {
  if (currentSuite) {
    currentSuite.afterEach = fn;
  }
}

const runner = new TestRunner();
let currentSuite: TestSuite | null = null;

export { runner };
