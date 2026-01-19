#!/usr/bin/env bun
/**
 * 模拟 Claude CLI - 用于测试 runcc 的环境变量设置
 *
 * 使用方法:
 * 1. 构建此脚本: bun build test/mock-claude.ts --outfile test/mock-claude --target node
 * 2. 添加到 PATH: export PATH="/Users/huabinhong/Code/runcc/test:$PATH"
 * 3. 运行测试: bun run src/index.ts glm
 */

import { spawn } from 'node:child_process';

// 获取环境变量
const {
  ANTHROPIC_BASE_URL,
  ANTHROPIC_AUTH_TOKEN,
  http_proxy,
  https_proxy,
  HTTP_PROXY,
  HTTPS_PROXY,
} = process.env;

console.log('\n=== 模拟 Claude CLI 启动 ===\n');

// 显示环境变量配置
console.log('📡 API Endpoint:', ANTHROPIC_BASE_URL || '未设置');
console.log('🔑 API Key:', ANTHROPIC_AUTH_TOKEN ? `${ANTHROPIC_AUTH_TOKEN.slice(0, 8)}...` : '未设置');

const proxy = http_proxy || https_proxy || HTTP_PROXY || HTTPS_PROXY;
if (proxy) {
  console.log('🌐 代理:', proxy);
} else {
  console.log('🌐 代理: 未设置');
}

// 验证配置
let hasError = false;

if (!ANTHROPIC_BASE_URL) {
  console.log('\n❌ 错误: ANTHROPIC_BASE_URL 未设置');
  hasError = true;
}

if (!ANTHROPIC_AUTH_TOKEN) {
  console.log('\n❌ 错误: ANTHROPIC_AUTH_TOKEN 未设置');
  hasError = true;
}

if (!hasError) {
  console.log('\n✅ 配置验证通过！');

  // 显示将启动的命令
  console.log('\n📋 将执行: claude');
  console.log('📋 环境变量:');
  console.log(`   ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL}`);
  console.log(`   ANTHROPIC_AUTH_TOKEN=${ANTHROPIC_AUTH_TOKEN?.slice(0, 8)}...`);
  if (proxy) {
    console.log(`   http_proxy=${proxy}`);
    console.log(`   https_proxy=${proxy}`);
  }

  // 如果有 REAL_CLAUDE=1 环境变量，则启动真实的 claude
  if (process.env.REAL_CLAUDE === '1') {
    console.log('\n🚀 启动真实的 Claude CLI...\n');
    const claude = spawn('claude.real', [], {
      stdio: 'inherit',
      env: process.env,
    });
    claude.on('close', (code) => {
      process.exit(code ?? 0);
    });
  } else {
    console.log('\n💡 提示: 设置 REAL_CLAUDE=1 可启动真实的 claude 命令');
    console.log('💡 提示: 当前为模拟模式，不会实际启动 Claude\n');
  }
} else {
  console.log('\n❌ 配置验证失败！');
  process.exit(1);
}
