import { z } from 'zod';

/**
 * 构造必填非空字符串字段。
 * 默认会先去除首尾空格，确保前后端对“空白字符串”有一致语义。
 */
export function requiredTextField(label: string) {
  return z.string().trim().min(1, `${label} is required`);
}

/**
 * 构造可选非空字符串字段。
 * 适合“可传可不传，但传了就不能为空字符串”的更新场景。
 */
export function optionalTextField(label: string) {
  return requiredTextField(label).optional();
}

/**
 * 构造通用 ID 字段。
 * 统一约定所有 ID 都使用同一套提示文案。
 */
export function requiredIdField(label: string) {
  return requiredTextField(`${label} id`);
}

/**
 * 构造正整数字段。
 * 适合数量、分页大小、批量生成数量等数值型输入。
 */
export function positiveIntegerField(label: string) {
  return z
    .number()
    .int(`${label} must be a positive integer`)
    .positive(`${label} must be a positive integer`);
}

/**
 * 构造可选备注字段。
 * 当前仅做类型约束，具体长度限制可在业务侧按需补充。
 */
export function optionalRemarkField() {
  return z.string().optional();
}

/**
 * 构造可空文本字段。
 * 适合封面图、补充说明这类允许显式传 null 的字段。
 */
export function nullableTextField() {
  return z.string().trim().nullable();
}
