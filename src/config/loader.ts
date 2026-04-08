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
    env.provider = process.env.CLAW_PROVIDER as 'anthropic' | 'openai' | 'local';
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
  const configPath = path.join(os.homedir(), '.claw', 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw new ConfigError(`Failed to load config from ${configPath}: ${error}`);
  }
}

export async function loadConfig(overrides?: Partial<ClawConfig>): Promise<ClawConfig> {
  // Load from multiple sources and merge
  const fileConfig = await loadFileConfig();
  const envConfig = loadEnvConfig();

  // Merge priority: defaults < file < env < overrides
  const merged = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
    ...overrides,
  };

  // Validate
  const result = configSchema.safeParse(merged);

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new ConfigError(`Invalid configuration: ${errors}`);
  }

  // Expand paths
  const config = result.data as ClawConfig;
  config.sessionDir = expandPath(config.sessionDir);
  config.logDir = expandPath(config.logDir);

  return config;
}

export async function saveConfig(config: Partial<ClawConfig>): Promise<void> {
  const configDir = path.join(os.homedir(), '.claw');
  const configPath = path.join(configDir, 'config.json');

  try {
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new ConfigError(`Failed to save config: ${error}`);
  }
}
