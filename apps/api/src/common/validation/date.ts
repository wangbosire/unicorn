import * as dayjs from 'dayjs';
import { BizError } from '../http/biz-error';

/**
 * 通用时间区间入参。
 */
export type DateRangeInput = {
  from: string;
  to: string;
};

/**
 * 通用时间区间返回值。
 */
export type DateRangeValue = {
  from: Date;
  to: Date;
};

/**
 * 解析并校验时间区间。
 * 统一使用 dayjs 判断合法性，避免各模块重复编写 Date 判空与先后校验。
 */
export function parseDateRange(
  input: DateRangeInput,
  options: {
    errorCode: string;
    invalidMessage: string;
    outOfOrderMessage: string;
  },
): DateRangeValue {
  const from = dayjs(input.from);
  const to = dayjs(input.to);

  if (!from.isValid() || !to.isValid()) {
    throw new BizError({
      code: options.errorCode,
      message: options.invalidMessage,
    });
  }

  if (!from.isBefore(to)) {
    throw new BizError({
      code: options.errorCode,
      message: options.outOfOrderMessage,
    });
  }

  return {
    from: from.toDate(),
    to: to.toDate(),
  };
}
