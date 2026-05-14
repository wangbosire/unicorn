import * as dayjs from 'dayjs'

/**
 * 将 Date 转为毫秒时间戳。
 */
export function toTimestamp(date: Date): number {
  return dayjs(date).valueOf();
}

/**
 * 将可空 Date 转为毫秒时间戳。
 */
export function toNullableTimestamp(date?: Date | null): number | null {
  return date ? toTimestamp(date) : null;
}
