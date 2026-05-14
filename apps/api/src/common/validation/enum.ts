import { BizError } from '../http/biz-error';

/**
 * 解析可选枚举筛选值。
 * 用于列表查询这类“可传可不传”的状态字段，避免各业务模块重复手写枚举判断。
 */
export function parseOptionalEnumValue<TValue extends string>(
  value: string | undefined,
  allowedValues: readonly TValue[],
  errorCode: string,
  errorMessage: string,
): TValue | undefined {
  if (!value) {
    return undefined;
  }

  if (allowedValues.includes(value as TValue)) {
    return value as TValue;
  }

  throw new BizError({
    code: errorCode,
    message: errorMessage,
  });
}
