/**
 * 参数透传工具
 * 处理 -- 分隔符后的参数提取和验证
 */

/** 参数验证错误 */
export class PassthroughArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PassthroughArgsError';
  }
}

/**
 * 从 argv 中提取 -- 之后的参数
 * @param argv 完整的 argv 数组（包括 node 和脚本路径）
 * @returns -- 之后的参数数组，如果没有 -- 则返回空数组
 */
export function extractPassthroughArgs(argv: string[]): string[] {
  const userArgs = argv.slice(2);
  const dashIndex = userArgs.indexOf('--');

  if (dashIndex === -1) {
    return [];
  }

  return userArgs.slice(dashIndex + 1);
}

/**
 * 验证 -- 的位置是否正确
 * @param argv 完整的 argv 数组（包括 node 和脚本路径）
 * @throws {PassthroughArgsError} 当 -- 位置不正确时
 */
export function validateDashPosition(argv: string[]): void {
  const userArgs = argv.slice(2);
  const dashIndex = userArgs.indexOf('--');

  if (dashIndex === -1) {
    return;
  }

  // 允许 -- 作为第一个参数（官方模式 + 参数传递）
  if (dashIndex === 0) {
    return;
  }

  // 检查 -- 之前的参数是否包含有效的 provider 或选项
  const beforeDash = userArgs.slice(0, dashIndex);
  const hasValidPrefix = beforeDash.some(arg =>
    !arg.startsWith('-') || arg === '--claude'
  );

  if (!hasValidPrefix) {
    throw new PassthroughArgsError('必须在 provider 名称或 --claude 选项之后');
  }
}
