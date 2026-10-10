export class Left<L, R> {
  readonly value: L;
  constructor(value: L) {
    this.value = value;
  }
  isLeft(): this is Left<L, R> {
    return true;
  }
  isRight(): this is Right<L, R> {
    return false;
  }
}

export class Right<L, R> {
  readonly value: R;
  constructor(value: R) {
    this.value = value;
  }
  isLeft(): this is Left<L, R> {
    return false;
  }
  isRight(): this is Right<L, R> {
    return true;
  }
}

export type Either<L, R> = Left<L, R> | Right<L, R>;

export const Either = {
  left<L, R = never>(value: L): Either<L, R> {
    return new Left<L, R>(value);
  },
  right<R, L = never>(value: R): Either<L, R> {
    return new Right<L, R>(value);
  },
  fold<L, R, T>(either: Either<L, R>, onLeft: (left: L) => T, onRight: (right: R) => T): T {
    return either.isLeft() ? onLeft(either.value) : onRight(either.value);
  },
};
