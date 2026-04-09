/**
 * First-time Setup Wizard / 首次設置嚮導
 * Phase 2 - User onboarding / 用戶引導
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.vihiclaw');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

async function askQuestion(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

export async function runSetupWizard(): Promise<boolean> {
  console.log(chalk.bold.cyan('\n🐾 歡迎使用 VIHIclaw - AI 編程代理'));
  console.log(chalk.gray('歡迎使用 VIHIclaw - AI Coding Agent\n'));

  console.log('這是您的首次啟動，讓我們快速完成設置。\n');
  console.log('This is your first launch. Let\'s quickly set up.\n');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // 選擇 Provider
    console.log(chalk.yellow('1. 選擇 AI 提供商 / Select AI Provider:'));
    console.log('   1) anthropic (Claude)');
    console.log('   2) openai (GPT)');
    console.log('   3) deepseek (深度求索)');
    console.log('   4) minimax (稀宇科技)');
    console.log('   5) kimi (月之暗面)');
    console.log('   6) other (其他 OpenAI 兼容服務商)');
    console.log('   7) local (Ollama / 本地模型)');

    const providerChoice = await askQuestion(rl, '\n選擇 (1-7) / Choice (1-7) [3]: ') || '3';

    const providerMap: Record<string, string> = {
      '1': 'anthropic',
      '2': 'openai',
      '3': 'deepseek',
      '4': 'minimax',
      '5': 'kimi',
      '6': 'other',
      '7': 'local',
    };

    const provider = providerMap[providerChoice] || 'deepseek';

    // 輸入 API Key - 強制要求
    console.log(chalk.yellow('\n2. 輸入 API 密鑰 / Enter API Key:'));
    console.log(chalk.gray('   您的密鑰將安全存儲在 ~/.vihiclaw/config.json'));
    console.log(chalk.gray('   Your key will be securely stored in ~/.vihiclaw/config.json'));

    if (provider === 'local') {
      console.log(chalk.gray('\n   使用本地模型無需 API 密鑰 / Local models don\'t need API key'));
    }

    let apiKey = '';
    if (provider !== 'local') {
      while (!apiKey) {
        apiKey = await askQuestion(rl, '\nAPI Key (必填 / required): ');
        if (!apiKey) {
          console.log(chalk.red('API Key 不能為空 / API Key cannot be empty'));
        }
      }
    }

    // 選擇模型
    console.log(chalk.yellow('\n3. 選擇模型 / Select Model:'));

    let defaultModel = 'deepseek-chat';
    const providerModels: Record<string, string[]> = {
      anthropic: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
      deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
      minimax: ['abab6.5-chat', 'abab6.5s-chat'],
      kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-for-coding'],
      other: ['gpt-3.5-turbo', 'custom-model'],
      local: ['llama3.2', 'codellama', 'mistral'],
    };

    const models = providerModels[provider] || providerModels.other;
    models.forEach((m, i) => {
      console.log(`   ${i + 1}) ${m}`);
    });
    console.log('   0) 自定義 / Custom');

    const modelChoice = await askQuestion(rl, '\n選擇模型編號 / Select model number [1]: ') || '1';
    let model = defaultModel;
    if (modelChoice === '0') {
      model = await askQuestion(rl, '輸入自定義模型名稱 / Enter custom model name: ') || defaultModel;
    } else {
      const idx = parseInt(modelChoice) - 1;
      if (idx >= 0 && idx < models.length) {
        model = models[idx];
      }
    }

    // 自定義端點（可選）
    let baseUrl = '';
    const defaultUrls: Record<string, string> = {
      anthropic: 'https://api.anthropic.com/v1',
      openai: 'https://api.openai.com/v1',
      deepseek: 'https://api.deepseek.com/v1',
      minimax: 'https://api.minimax.chat/v1',
      kimi: 'https://api.moonshot.cn/v1',
      other: '',
      local: 'http://localhost:11434/v1',
    };

    if (provider === 'other' || provider === 'kimi' || provider === 'deepseek') {
      console.log(chalk.yellow('\n4. 自定義 API 端點（可選）/ Custom API Endpoint (optional):'));
      console.log(chalk.gray(`   默認 / Default: ${defaultUrls[provider] || 'none'}`));
      console.log(chalk.gray('   例如 / Example: https://api.kimi.com/coding/v1'));

      const customUrl = await askQuestion(rl, '\nAPI 端點 / API Endpoint (留空使用默認 / press Enter for default): ');
      if (customUrl) {
        baseUrl = customUrl;
      }
    }

    // 高級選項
    console.log(chalk.yellow('\n5. 高級選項（可選）/ Advanced Options (optional):'));

    const maxTokens = await askQuestion(rl, '最大輸出 token 數 / Max output tokens [8192]: ') || '8192';
    const contextWindow = await askQuestion(rl, '上下文窗口大小 / Context window size [65536]: ') || '65536';

    // 創建配置
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const config: Record<string, unknown> = {
      provider,
      model,
      maxIterations: 10,
      temperature: 0,
      maxTokens: parseInt(maxTokens),
      contextWindowSize: parseInt(contextWindow),
      dryRun: false,
      confirmDestructive: true,
      allowedShellCommands: ['ls', 'cat', 'grep', 'find', 'git', 'npm', 'node'],
      blockedPaths: ['~/.ssh', '~/.gnupg'],
      saveSession: true,
    };

    if (apiKey) {
      config.apiKey = apiKey;
    }

    if (baseUrl) {
      config.baseUrl = baseUrl;
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    console.log(chalk.green('\n✅ 設置完成！/ Setup complete!'));
    console.log(chalk.gray(`配置已保存到 / Config saved to: ${CONFIG_FILE}`));
    console.log(chalk.cyan('\n現在可以開始使用 / You can now start using VIHIclaw:'));
    console.log(chalk.bold('  vihi\n'));

    return true;
  } catch (error) {
    console.error(chalk.red('\n❌ 設置失敗 / Setup failed:'), error);
    return false;
  } finally {
    rl.close();
  }
}

export function isFirstRun(): boolean {
  return !existsSync(CONFIG_FILE);
}
