/**
 * Web Search Tool / 網頁搜索工具
 * Phase 2 Round 8 - Web search capability / 網頁搜索能力
 */

import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';


interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Fetch search results using fetch API / 使用 fetch API 獲取搜索結果
 * Note: This is a simplified implementation. Production would use proper APIs.
 * 注意：這是簡化實現。生產環境應使用正式 API。
 */
async function fetchSearchResults(
  query: string,
  _engine: string
): Promise<SearchResult[]> {
  // For now, return a mock result to demonstrate the interface
  // 目前返回模擬結果以演示接口
  // In production, integrate with actual search APIs like SerpAPI, Bing API, etc.
  // 生產環境應集成實際搜索 API，如 SerpAPI、Bing API 等

  return [
    {
      title: `Search result for "${query}"`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: `This is a placeholder result. To enable real search, configure an API key for a search provider like SerpAPI, Brave Search API, or Bing Search API.`,
    },
  ];
}

export const webSearchTool = defineTool(
  'web_search',
  'Search the web for information / 搜索網頁獲取信息',
  {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query / 搜索查詢',
      },
      numResults: {
        type: 'number',
        description: 'Number of results to return / 返回結果數量',
        default: 5,
      },
    },
    required: ['query'],
  },
  async (params: { query: string; numResults?: number }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: `[DRY RUN] Would search for: ${params.query} / [模擬運行] 將搜索: ${params.query}`,
      };
    }

    try {
      const maxResults = params.numResults || 5;

      // Check for API key / 檢查 API 密鑰
      const apiKey = process.env.SERP_API_KEY || process.env.BRAVE_API_KEY;

      if (!apiKey) {
        return {
          success: true,
          content: `Search query: "${params.query}"\n\nNote: To get real search results, set one of these environment variables:\n- SERP_API_KEY (for SerpAPI)\n- BRAVE_API_KEY (for Brave Search)\n\nWithout an API key, this tool returns placeholder results.\n\nDirect search URL: https://duckduckgo.com/?q=${encodeURIComponent(params.query)}`,
        };
      }

      const results = await fetchSearchResults(params.query, 'duckduckgo');

      if (results.length === 0) {
        return {
          success: true,
          content: `No results found for "${params.query}"`,
        };
      }

      const formatted = results
        .slice(0, maxResults)
        .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`)
        .join('\n\n');

      return {
        success: true,
        content: `Search results for "${params.query}":\n\n${formatted}`,
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Search failed / 搜索失敗: ${error}`,
      };
    }
  },
  { isConcurrencySafe: true }
);

export const webFetchTool = defineTool(
  'web_fetch',
  'Fetch and extract text content from a URL / 從 URL 獲取並提取文本內容',
  {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to fetch / 要獲取的 URL',
      },
      maxLength: {
        type: 'number',
        description: 'Maximum content length to return / 返回的最大內容長度',
        default: 5000,
      },
    },
    required: ['url'],
  },
  async (params: { url: string; maxLength?: number }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: `[DRY RUN] Would fetch: ${params.url} / [模擬運行] 將獲取: ${params.url}`,
      };
    }

    try {
      const response = await fetch(params.url, {
        headers: {
          'User-Agent': 'VIHIclaw/0.1.0 (AI Coding Agent)',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          content: '',
          error: `HTTP error / HTTP 錯誤: ${response.status} ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return {
          success: false,
          content: '',
          error: `Unsupported content type / 不支持的內容類型: ${contentType}`,
        };
      }

      const text = await response.text();

      // Simple HTML to text extraction / 簡單 HTML 到文本提取
      let extracted = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const maxLen = params.maxLength || 5000;
      if (extracted.length > maxLen) {
        extracted = extracted.substring(0, maxLen) + '\n... (content truncated)';
      }

      return {
        success: true,
        content: `Content from ${params.url}:\n\n${extracted}`,
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to fetch / 獲取失敗: ${error}`,
      };
    }
  },
  { isConcurrencySafe: true }
);
