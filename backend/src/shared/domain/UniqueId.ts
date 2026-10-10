import { randomUUID } from 'node:crypto';
export const UniqueId = {
  generate(): string {
    return randomUUID();
  },
};
