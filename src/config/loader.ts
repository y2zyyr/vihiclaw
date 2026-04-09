import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { configSchema, DEFAULT_CONFIG } from './schema.js';
import { ClawConfig } from '../types/index.js';
import { ConfigError } from '../utils/errors.js';

function expandPath(filepath: string): string {
  if (filepath.startsWith('~/')) {
    return path.join(os.homedir(), filepath.slice(2));
  }
  return filepath;
}

function loadEnvConfig(): Partial<ClawConfig> {
  const env: Partial<ClawConfig> = {};

  if (process.env.CLAW_PROVIDER) {
    env.provider = process.env.CLAW_PROVIDER as 'anthropic' | 'openai' | 'deepseek' | 'minimax' | 'kimi' | 'other' | 'local';
  }
  if (process.env.CLAW_MODEL) {
    env.model = process.env.CLAW_MODEL;
  }
  if (process.env.CLAW_API_KEY) {
    env.apiKey = process.env.CLAW_API_KEY;
  }
  if (process.env.CLAW_BASE_URL) {
    env.baseUrl = process.env.CLAW_BASE_URL;
  }
  if (process.env.CLAW_MAX_ITERATIONS) {
    env.maxIterations = parseInt(process.env.CLAW_MAX_ITERATIONS, 10);
  }
  if (process.env.CLAW_TEMPERATURE) {
    env.temperature = parseFloat(process.env.CLAW_TEMPERATURE);
  }
  if (process.env.CLAW_DRY_RUN) {
    env.dryRun = process.env.CLAW_DRY_RUN === 'true';
  }
  if (process.env.CLAW_CONFIRM_DESTRUCTIVE) {
    env.confirmDestructive = process.env.CLAW_CONFIRM_DESTRUCTIVE === 'true';
  }
  if (process.env.CLAW_SESSION_DIR) {
    env.sessionDir = process.env.CLAW_SESSION_DIR;
  }
  if (process.env.CLAW_LOG_DIR) {
    env.logDir = process.env.CLAW_LOG_DIR;
  }
  if (process.env.CLAW_LOG_LEVEL) {
    env.logLevel = process.env.CLAW_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error';
  }
  if (process.env.CLAW_STREAM_RESPONSE) {
    env.streamResponse = process.env.CLAW_STREAM_RESPONSE === 'true';
  }
  if (process.env.CLAW_SAVE_SESSION) {
    env.saveSession = process.env.CLAW_SAVE_SESSION === 'true';
  }

  return env;
}

async function loadFileConfig(): Promise<Partial<ClawConfig>> {
  // Try .vihiclaw first, then fall back to .claw / 先嘗試 .vihiclaw，然後回退到 .claw
  const configPath = path.join(os.homedir(), '.vihiclaw', 'config.json');
  const legacyPath = path.join(os.homedir(), '.claw', 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Try legacy path / 嘗試舊路徑
      try {
        const content = await fs.readFile(legacyPath, 'utf-8');
        return JSON.parse(content);
      } catch (legacyError) {
        if ((legacyError as NodeJS.ErrnoException).code === 'ENOENT') {
          return {};
        }
        throw new ConfigError(`Failed to load config from ${legacyPath}: ${legacyError}`);
      }
    }
    throw new ConfigError(`Failed to load config from ${configPath}: ${error}`);
  }
}

/**
 * Format validation error with helpful suggestions / 格式化驗證錯誤並提供有用建議
 */
function formatValidationError(error: any): string {
  const issues = error.errors || [];
  const messages: string[] = [];

  for (const issue of issues) {
    const path = issue.path?.join('.') || 'config';
    const message = issue.message || 'Invalid value / 無效值';

    let suggestion = '';

    // Add helpful suggestions for common errors / 為常見錯誤添加建議
    if (path === 'provider') {
      suggestion = 'Valid providers / 有效提供者: anthropic, openai, deepseek, minimax, kimi, other, local';
    } else if (path === 'apiKey') {
      suggestion = 'Set via CLAW_API_KEY environment variable or config file / 通過 CLAW_API_KEY 環境變量或配置文件設置';
    } else if (path === 'maxIterations') {
      suggestion = 'Must be between 1 and 1000 / 必須在 1 到 1000 之間';
    } else if (path === 'temperature') {
      suggestion = 'Must be between 0 and 2 / 必須在 0 到 2 之間';
    } else if (path === 'logLevel') {
      suggestion = 'Valid levels / 有效級別: debug, info, warn, error';
    }

    messages.push(`  - ${path}: ${message}${suggestion ? `\n    ${suggestion}` : ''}`);
  }

  return messages.join('\n');
}

export async function loadConfig(overrides?: Partial<ClawConfig>): Promise<ClawConfig> {
  // Load from multiple sources and merge / 從多個來源加載並合併
  const fileConfig = await loadFileConfig();
  const envConfig = loadEnvConfig();

  // Merge priority: defaults < file < env < overrides / 合併優先級：默認 < 文件 < 環境 < 覆蓋
  const merged = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
    ...overrides,
  };

  // Validate / 驗證
  const result = configSchema.safeParse(merged);

  if (!result.success) {
    const errorMessage = formatValidationError(result.error);
    throw new ConfigError(
      `Configuration validation failed / 配置驗證失敗:\n${errorMessage}\n\n` +
      `Check your ~/.vihiclaw/config.json or environment variables / 檢查 ~/.vihiclaw/config.json 或環境變量\n` +
      `Run 'vihi --help' for configuration options / 運行 'vihi --help' 查看配置選項`
    );
  }

  // Expand paths / 展開路徑
  const config = result.data as ClawConfig;
  config.sessionDir = expandPath(config.sessionDir);
  config.logDir = expandPath(config.logDir);

  return config;
}

export async function saveConfig(config: Partial<ClawConfig>): Promise<void> {
  const configDir = path.join(os.homedir(), '.vihiclaw');
  const configPath = path.join(configDir, 'config.json');

  try {
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new ConfigError(
      `Failed to save config / 保存配置失敗: ${error}\n\n` +
      `Make sure you have write permission to ${configDir} / 確保您有 ${configDir} 的寫入權限`
    );
  }
}
