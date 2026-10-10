/** Must stay within the API's accepted `page` range (1..100000). */
const MAX_PAGE = 100000;

/** Parses the `page` search param: anything that is not a positive number becomes page 1. */
export function parsePageParam(raw: string | undefined): number {
  const page = Math.trunc(Number(raw)) || 1;
  return Math.min(Math.max(1, page), MAX_PAGE);
}
