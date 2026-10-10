import type { Either } from '../domain/Either.js';
import type { DomainError } from '../domain/DomainError.js';
export interface ICommandHandler<TCommand, TResult> {
  execute(command: TCommand): Promise<Either<DomainError, TResult>>;
}
