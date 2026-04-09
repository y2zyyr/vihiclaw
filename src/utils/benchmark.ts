/**
 * Benchmark Runner / 基準測試運行器
 * Phase 2 Round 28 - Performance benchmarks / 性能基準測試
 */

import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

export class BenchmarkRunner {
  async run(
    name: string,
    fn: () => void | Promise<void>,
    iterations = 1000
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup / 預熱
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn();
    }

    // Benchmark / 基準測試
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();
      await fn();
      times.push(performance.now() - iterStart);
    }

    const totalTime = performance.now() - start;

    return {
      name,
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      opsPerSecond: (iterations / totalTime) * 1000,
    };
  }

  formatResult(result: BenchmarkResult): string {
    return [
      `Benchmark: ${result.name}`,
      `  Iterations: ${result.iterations.toLocaleString()}`,
      `  Total: ${result.totalTime.toFixed(2)}ms`,
      `  Average: ${result.avgTime.toFixed(3)}ms`,
      `  Min: ${result.minTime.toFixed(3)}ms`,
      `  Max: ${result.maxTime.toFixed(3)}ms`,
      `  Ops/sec: ${result.opsPerSecond.toFixed(0)}`,
    ].join('\n');
  }
}
