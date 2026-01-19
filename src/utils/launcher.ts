/**
 * Claude 启动器
 * 负责启动 Claude CLI 进程
 */

import { spawn } from 'node:child_process';
import type { LaunchOptions } from '../config/types.js';
import { buildEnv, buildOfficialEnv } from './env.js';

/**
 * 启动 Claude 进程
 * @param options 启动选项
 * @param claudeArgs 传递给 Claude CLI 的参数
 * @returns 子进程对象
 */
export function launchClaude(options: LaunchOptions, claudeArgs: string[] = []): ReturnType<typeof spawn> {
  const env = buildEnv(options);

  const child = spawn('claude', claudeArgs, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });

  return child;
}

/**
 * 启动官方 Claude（不使用第三方 endpoint）
 * @param proxyUrl 可选的代理地址
 * @param claudeArgs 传递给 Claude CLI 的参数
 * @returns 子进程对象
 */
export function launchOfficialClaude(proxyUrl?: string, claudeArgs: string[] = []): ReturnType<typeof spawn> {
  const env = buildOfficialEnv(proxyUrl);

  const child = spawn('claude', claudeArgs, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });

  return child;
}

/**
 * 等待进程结束
 * @param child 子进程对象
 * @returns 进程退出码
 */
export function waitForExit(child: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve) => {
    child.on('close', (code) => {
      resolve(code ?? 0);
    });
  });
}
