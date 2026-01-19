/**
 * CC-Run 类型定义
 */

/**
 * 模型映射配置
 * 将 Claude 的模型级别映射到第三方模型名
 */
export interface ModelMapping {
  /** Haiku 级别模型 */
  haiku?: string;
  /** Opus 级别模型 */
  opus?: string;
  /** Sonnet 级别模型 */
  sonnet?: string;
}

/**
 * Endpoint 配置
 */
export interface Endpoint {
  /** 名称 */
  name: string;
  /** API 地址 */
  endpoint: string;
  /** API Token */
  token?: string;
  /** 模型映射 (将 Claude 模型级别映射到第三方模型名) */
  models?: ModelMapping;
}

/**
 * 代理配置
 */
export interface ProxyConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 代理地址 */
  url?: string;
  /** 启动官方 claude 时是否清除 proxy */
  clearForOfficial?: boolean;
}

/**
 * RunCC 配置文件结构 (~/.runcc/config.json)
 */
export interface CcRunConfig {
  /** 自定义 endpoints */
  endpoints?: Endpoint[];
  /** 已保存的 tokens */
  tokens?: Record<string, string>;
  /** 最后使用的 provider */
  lastUsed?: string;
  /** 代理配置 */
  proxy?: ProxyConfig;
}

/**
 * Claude 官方配置结构 (~/.claude/settings.json)
 */
export interface ClaudeSettings {
  /** 代理地址 */
  proxy?: string;
  /** API 地址 (第三方 endpoint) */
  apiUrl?: string;
  /** API Key */
  anthropicApiKey?: string;
  /** 环境变量 */
  env?: Record<string, string>;
}

/**
 * 启动选项
 */
export interface LaunchOptions {
  /** API endpoint */
  apiEndpoint: string;
  /** API key */
  apiKey: string;
  /** 代理地址 (可选) */
  proxyUrl?: string;
  /** 是否为官方模式 (需要清除第三方配置) */
  isOfficial?: boolean;
  /** 模型映射 (可选) */
  models?: ModelMapping;
}
