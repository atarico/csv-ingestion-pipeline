export abstract class ValueObject<T extends Record<string, unknown>> {
  protected readonly props: Readonly<T>;

  protected constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  equals(other?: ValueObject<T>): boolean {
    if (other === undefined || other.constructor !== this.constructor) return false;
    const keys = Object.keys(this.props);
    if (keys.length !== Object.keys(other.props).length) return false;
    return keys.every((key) => this.props[key] === other.props[key]);
  }
}
