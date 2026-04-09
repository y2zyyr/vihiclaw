/**
 * Performance Monitor / 性能監控
 * Phase 2 Round 13 - Performance monitoring and profiling / 性能監控和分析
 */

import { performance } from 'perf_hooks';

interface Metric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  // tags unused;
}

interface OperationTiming {
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class PerformanceMonitor {
  private metrics: Metric[] = [];
  private activeTimers: Map<string, OperationTiming> = new Map();
  private maxMetrics: number;

  constructor(maxMetrics = 1000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Start timing an operation / 開始計時操作
   */
  startTimer(name: string, _tags?: Record<string, string>): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.activeTimers.set(id, {
      startTime: performance.now(),
    });
    return id;
  }

  /**
   * End timing and record metric / 結束計時並記錄指標
   */
  endTimer(id: string, _tags?: Record<string, string>): number | null {
    const timer = this.activeTimers.get(id);
    if (!timer) {
      return null;
    }

    timer.endTime = performance.now();
    timer.duration = timer.endTime - timer.startTime;

    this.recordMetric({
      name: id.split('-')[0],
      value: timer.duration,
      unit: 'ms',
      timestamp: Date.now(),
    });

    this.activeTimers.delete(id);
    return timer.duration;
  }

  /**
   * Record a metric / 記錄指標
   */
  recordMetric(metric: Metric): void {
    this.metrics.push(metric);

    // Keep only recent metrics / 只保留最近的指標
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get average timing for an operation / 獲取操作的平均計時
   */
  getAverageTime(name: string): number | null {
    const relevant = this.metrics.filter(
      (m) => m.name === name && m.unit === 'ms'
    );

    if (relevant.length === 0) {
      return null;
    }

    const sum = relevant.reduce((acc, m) => acc + m.value, 0);
    return sum / relevant.length;
  }

  /**
   * Get percentile timing / 獲取百分位計時
   */
  getPercentile(name: string, percentile: number): number | null {
    const relevant = this.metrics
      .filter((m) => m.name === name && m.unit === 'ms')
      .map((m) => m.value)
      .sort((a, b) => a - b);

    if (relevant.length === 0) {
      return null;
    }

    const index = Math.floor((percentile / 100) * relevant.length);
    return relevant[Math.min(index, relevant.length - 1)];
  }

  /**
   * Get summary statistics / 獲取摘要統計
   */
  getSummary(): Record<
    string,
    { count: number; avg: number; p95: number; p99: number }
  > {
    const summary: Record<
      string,
      { count: number; avg: number; p95: number; p99: number }
    > = {};

    const names = [...new Set(this.metrics.map((m) => m.name))];

    for (const name of names) {
      const values = this.metrics
        .filter((m) => m.name === name && m.unit === 'ms')
        .map((m) => m.value)
        .sort((a, b) => a - b);

      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const p95Index = Math.floor(0.95 * values.length);
        const p99Index = Math.floor(0.99 * values.length);

        summary[name] = {
          count: values.length,
          avg,
          p95: values[p95Index] || values[values.length - 1],
          p99: values[p99Index] || values[values.length - 1],
        };
      }
    }

    return summary;
  }

  /**
   * Clear all metrics / 清除所有指標
   */
  clear(): void {
    this.metrics = [];
    this.activeTimers.clear();
  }
}

// Global performance monitor instance / 全局性能監控實例
export const perfMonitor = new PerformanceMonitor();
