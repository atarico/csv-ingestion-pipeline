export interface PaginationParams {
  page: number; // 1-based
  limit: number;
}
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export function totalPages(total: number, limit: number): number {
  return total === 0 ? 0 : Math.ceil(total / limit);
}
