/**
 * Startup profiling utility / 啟動性能分析工具
 *
 * Based on Claude Code CLI's startupProfiler / 基於 Claude Code CLI 的 startupProfiler
 *
 * Usage: CLAW_PROFILE_STARTUP=1 vihiclaw
 */

import { performance } from 'perf_hooks';

const SHOULD_PROFILE = process.env.CLAW_PROFILE_STARTUP === '1';

interface Checkpoint {
  name: string;
  time: number;
  memory: NodeJS.MemoryUsage;
}

const checkpoints: Checkpoint[] = [];

/**
 * Record a checkpoint with the given name / 記錄指定名稱的檢查點
 */
export function profileCheckpoint(name: string): void {
  if (!SHOULD_PROFILE) return;

  checkpoints.push({
    name,
    time: performance.now(),
    memory: process.memoryUsage(),
  });
}

/**
 * Get formatted profiling report / 獲取格式化的分析報告
 */
export function getProfileReport(): string {
  if (!SHOULD_PROFILE) {
    return 'Profiling not enabled. Use CLAW_PROFILE_STARTUP=1 to enable.';
  }

  if (checkpoints.length === 0) {
    return 'No checkpoints recorded.';
  }

  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push('Startup Profiling Report / 啟動性能分析報告');
  lines.push('='.repeat(60));
  lines.push('');

  let prevTime = checkpoints[0].time;
  let prevMemory = checkpoints[0].memory.heapUsed;

  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    const timeDiff = i === 0 ? 0 : cp.time - prevTime;
    const memoryDiff = cp.memory.heapUsed - prevMemory;

    lines.push(
      `${cp.name.padEnd(30)} +${formatMs(timeDiff).padStart(8)} ${
        i === 0 ? '' : `(+${formatBytes(memoryDiff)})`
      }`
    );

    prevTime = cp.time;
    prevMemory = cp.memory.heapUsed;
  }

  lines.push('');
  lines.push(
    `Total time / 總時間: ${formatMs(
      checkpoints[checkpoints.length - 1].time - checkpoints[0].time
    )}`
  );
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Print profiling report to stderr / 將分析報告輸出到 stderr
 */
export function printProfileReport(): void {
  if (!SHOULD_PROFILE) return;
  console.error(getProfileReport());
}

function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes: number): string {
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${bytes}b`;
  if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}mb`;
}
