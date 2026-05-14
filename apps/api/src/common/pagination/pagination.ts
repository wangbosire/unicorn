import { parseWithSchema } from '../validation/schema';
import { z } from 'zod';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

const positiveIntegerStringSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'pagination params must be positive integers')
  .transform((value) => Number(value))
  .refine((value) => Number.isInteger(value) && value > 0, {
    message: 'pagination params must be positive integers',
  });

const paginationQuerySchema = z.object({
  page: positiveIntegerStringSchema.optional(),
  pageSize: positiveIntegerStringSchema.optional(),
});

/**
 * 通用分页输入结构。
 */
export type PaginationQueryInput = {
  page?: string;
  pageSize?: string;
};

/**
 * 通用分页参数。
 */
export type PaginationParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

/**
 * 通用分页返回结构。
 */
export type PaginatedResult<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * 解析分页参数并补足 skip / take。
 */
export function parsePaginationQuery(
  query: PaginationQueryInput,
): PaginationParams {
  const parsedQuery = parseWithSchema(paginationQuerySchema, query);
  const page = parsedQuery.page ?? DEFAULT_PAGE;
  const pageSize = parsedQuery.pageSize ?? DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * 构造统一分页返回结构。
 */
export function buildPaginatedResult<TItem>(params: {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
}): PaginatedResult<TItem> {
  return {
    items: params.items,
    page: params.page,
    pageSize: params.pageSize,
    total: params.total,
  };
}
