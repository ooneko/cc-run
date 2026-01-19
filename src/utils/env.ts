/**
 * 环境变量工具
 * 负责构建启动 Claude 时所需的环境变量
 */

import type { LaunchOptions } from '../config/types.js';

/**
 * 构建启动 Claude 所需的环境变量
 * @param options 启动选项
 * @returns 环境变量对象
 */
export function buildEnv(options: LaunchOptions): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    // 总是设置 API endpoint 和 key
    ANTHROPIC_BASE_URL: options.apiEndpoint,
    ANTHROPIC_AUTH_TOKEN: options.apiKey,
  };

  // 如果配置了模型映射，设置模型环境变量
  if (options.models) {
    if (options.models.haiku) {
      env.ANTHROPIC_DEFAULT_HAIKU_MODEL = options.models.haiku;
    }
    if (options.models.opus) {
      env.ANTHROPIC_DEFAULT_OPUS_MODEL = options.models.opus;
    }
    if (options.models.sonnet) {
      env.ANTHROPIC_DEFAULT_SONNET_MODEL = options.models.sonnet;
    }
  }

  // 如果需要代理，设置代理环境变量
  if (options.proxyUrl) {
    env.http_proxy = options.proxyUrl;
    env.https_proxy = options.proxyUrl;
    env.HTTP_PROXY = options.proxyUrl;
    env.HTTPS_PROXY = options.proxyUrl;
  }

  return env;
}

/**
 * 构建官方模式的环境变量（不使用第三方 endpoint）
 * @param proxyUrl 可选的代理地址
 * @returns 环境变量对象
 */
export function buildOfficialEnv(proxyUrl?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};

  if (proxyUrl) {
    env.http_proxy = proxyUrl;
    env.https_proxy = proxyUrl;
    env.HTTP_PROXY = proxyUrl;
    env.HTTPS_PROXY = proxyUrl;
  }

  return env;
}
