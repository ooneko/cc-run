/**
 * Add 命令
 * 添加自定义 endpoint
 */

import { createInterface } from 'node:readline';
import { isBuiltinEndpoint } from '../config/endpoints.js';
import { addCustomEndpoint } from '../config/storage.js';
import type { ModelMapping } from '../config/types.js';

async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function add(name: string, endpoint: string): Promise<void> {
  if (isBuiltinEndpoint(name)) {
    console.error(`错误: 不能使用内置 endpoint 名称 "${name}"`);
    process.exit(1);
  }

  try {
    new URL(endpoint);
  } catch {
    console.error(`错误: 无效的 endpoint URL "${endpoint}"`);
    process.exit(1);
  }

  const token = await prompt(`请输入 ${name} 的 API Token: `);
  const modelName = await prompt('请输入模型名称: ');

  const models: ModelMapping = {
    haiku: modelName,
    opus: modelName,
    sonnet: modelName,
  };

  addCustomEndpoint(name, endpoint, token, models);
  console.log(`已添加 endpoint: ${name}`);
}
