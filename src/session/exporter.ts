/**
 * Session Exporter / 會話導出器
 * Phase 2 Surpass Point #3: Session Export & Portability / 第 3 個超越點：會話導出與可移植性
 *
 * Provides JSON and Markdown export capabilities that Claude Code lacks / 提供 Claude Code 缺乏的導出功能
 */

import { Session } from '../types/index.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { SessionManager } from './manager.js';

export interface ExportOptions {
  format: 'json' | 'markdown';
  outputPath: string;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  messageCount: number;
  error?: string;
}

/**
 * Export session to JSON format / 導出會話為 JSON 格式
 */
function exportToJSON(session: Session, options: ExportOptions): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    session: options.includeMetadata !== false ? session : {
      id: session.id,
      messages: session.messages,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export session to Markdown format / 導出會話為 Markdown 格式
 */
function exportToMarkdown(session: Session, options: ExportOptions): string {
  const lines: string[] = [];

  // Header / 標題
  lines.push('# VIHIclaw Session Export / 會話導出');
  lines.push('');

  // Metadata / 元數據
  if (options.includeMetadata !== false) {
    lines.push('## Session Info / 會話信息');
    lines.push('');
    lines.push(`- **Session ID / 會話 ID**: ${session.id}`);
    lines.push(`- **Created / 創建時間**: ${session.createdAt}`);
    lines.push(`- **Updated / 更新時間**: ${session.updatedAt}`);
    lines.push(`- **Messages / 消息數**: ${session.messages.length}`);
    lines.push(`- **Exported / 導出時間**: ${new Date().toISOString()}`);
    lines.push('');
  }

  // Messages / 消息
  lines.push('## Conversation / 對話');
  lines.push('');

  for (const msg of session.messages) {
    const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'Tool';
    const roleIcon = msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🤖' : '🔧';

    lines.push(`### ${roleIcon} ${role}`);
    lines.push('');

    if (msg.content) {
      lines.push(msg.content);
      lines.push('');
    }

    if (msg.toolCalls && msg.toolCalls.length > 0) {
      lines.push('**Tool Calls / 工具調用:**');
      for (const tc of msg.toolCalls) {
        lines.push(`- \`${tc.name}\`: ${JSON.stringify(tc.arguments)}`);
      }
      lines.push('');
    }

    if (msg.toolCallId) {
      lines.push(`*(Tool result for / 工具結果: ${msg.toolCallId})*`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Footer / 頁腳
  lines.push('');
  lines.push('*Exported by VIHIclaw / 由 VIHIclaw 導出*');

  return lines.join('\n');
}

/**
 * Export a session to file / 導出會話到文件
 */
export async function exportSession(
  sessionManager: SessionManager,
  sessionId: string,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Load session / 加載會話
    const session = await sessionManager.load(sessionId);
    if (!session) {
      return {
        success: false,
        messageCount: 0,
        error: `Session not found / 會話未找到: ${sessionId}`,
      };
    }

    // Ensure output directory exists / 確保輸出目錄存在
    const outputDir = dirname(options.outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate export content / 生成導出內容
    let content: string;
    switch (options.format) {
      case 'json':
        content = exportToJSON(session, options);
        break;
      case 'markdown':
        content = exportToMarkdown(session, options);
        break;
      default:
        return {
          success: false,
          messageCount: 0,
          error: `Unsupported format / 不支持的格式: ${options.format}`,
        };
    }

    // Write file / 寫入文件
    writeFileSync(options.outputPath, content, 'utf-8');

    return {
      success: true,
      outputPath: options.outputPath,
      messageCount: session.messages.length,
    };
  } catch (error) {
    return {
      success: false,
      messageCount: 0,
      error: `Export failed / 導出失敗: ${error}`,
    };
  }
}

/**
 * Get export filename suggestion / 獲取導出文件名建議
 */
export function suggestExportFilename(sessionId: string, format: 'json' | 'markdown'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const shortId = sessionId.substring(0, 8);
  const extension = format === 'json' ? 'json' : 'md';
  return `vihiclaw-session-${shortId}-${timestamp}.${extension}`;
}
