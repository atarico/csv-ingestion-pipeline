import type { Either } from '../../domain/Either.js';
import type { MessagingError } from '../../domain/DomainError.js';
export interface IMessagePublisher {
  publish<T extends object>(message: T): Promise<Either<MessagingError, void>>;
}
