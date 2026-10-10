import type { Either } from '../domain/Either.js';
import type { DomainError } from '../domain/DomainError.js';
export interface IQueryHandler<TQuery, TResult> {
  execute(query: TQuery): Promise<Either<DomainError, TResult>>;
}
