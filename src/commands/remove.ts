/**
 * Remove 命令
 * 删除自定义 endpoint
 */

import { isBuiltinEndpoint } from '../config/endpoints.js';
import { removeCustomEndpoint } from '../config/storage.js';

export function remove(name: string): void {
  // 检查是否为内置 endpoint
  if (isBuiltinEndpoint(name)) {
    console.error(`错误: 不能删除内置 endpoint "${name}"`);
    process.exit(1);
  }

  const success = removeCustomEndpoint(name);
  if (success) {
    console.log(`已删除 endpoint: ${name}`);
  } else {
    console.error(`错误: 未找到自定义 endpoint "${name}"`);
    process.exit(1);
  }
}
