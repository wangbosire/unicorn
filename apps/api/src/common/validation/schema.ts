import { BizError } from '../http/biz-error';
import { ZodError, type ZodType } from 'zod';

/**
 * 通过 Zod schema 解析输入。
 * 解析失败时统一转换为 BizError。
 */
export function parseWithSchema<TOutput>(
  schema: ZodType<TOutput>,
  input: unknown,
): TOutput {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: error.issues[0]?.message ?? 'validation failed',
        details: {
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    throw error;
  }
}
