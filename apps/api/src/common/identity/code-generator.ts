import { BizError } from '../http/biz-error';

/**
 * 统一编号生成配置。
 */
export type PrefixedCodeGeneratorOptions = {
  prefix: string;
  randomLength: number;
  maxAttempts: number;
  errorCode: string;
  errorMessage: string;
};

/**
 * 统一激活码生成配置。
 */
export type SegmentedCodeGeneratorOptions = {
  segmentLength: number;
  segmentCount: number;
  maxAttempts: number;
  errorCode: string;
  errorMessage: string;
};

/**
 * 生成日期前缀编号。
 * 格式为 `PREFIX-YYYYMMDD-RANDOM`，适合系列、批次、藏品等可读编号。
 */
export async function generatePrefixedCode(
  options: PrefixedCodeGeneratorOptions,
  isUnique: (candidate: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const randomPart = randomUppercaseBase36(options.randomLength);
    const candidate = `${options.prefix}-${datePart}-${randomPart}`;

    if (await isUnique(candidate)) {
      return candidate;
    }
  }

  throw new BizError({
    code: options.errorCode,
    message: options.errorMessage,
  });
}

/**
 * 生成分段激活码。
 * 默认适合输出 `ABCD-EFGH-IJKL` 这类便于人工核对的编码。
 */
export async function generateSegmentedCode(
  options: SegmentedCodeGeneratorOptions,
  isUnique: (candidate: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    const candidate = Array.from({ length: options.segmentCount }, () =>
      randomUppercaseBase36(options.segmentLength),
    ).join('-');

    if (await isUnique(candidate)) {
      return candidate;
    }
  }

  throw new BizError({
    code: options.errorCode,
    message: options.errorMessage,
  });
}

/**
 * 生成指定长度的大写 base36 随机片段。
 */
function randomUppercaseBase36(length: number): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
    .toUpperCase()
    .padEnd(length, '0');
}
