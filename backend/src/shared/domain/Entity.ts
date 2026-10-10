export abstract class Entity<TProps> {
  protected constructor(
    readonly id: string,
    protected readonly props: TProps,
  ) {}

  equals(other?: Entity<TProps>): boolean {
    return other !== undefined && other.constructor === this.constructor && other.id === this.id;
  }
}
