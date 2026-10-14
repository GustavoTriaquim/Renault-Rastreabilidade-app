import type {
  AppNotification,
  Dossier,
  Operator,
  Part,
  PartEvent,
  Review,
} from '@/types/domain';

/** Incrementar quando o formato persistido mudar de forma incompatível. */
export const DATABASE_VERSION = 1;

/** Estado completo da simulação: o que o backend guardaria. */
export interface Database {
  version: number;
  operators: Operator[];
  parts: Part[];
  events: PartEvent[];
  reviews: Review[];
  notifications: AppNotification[];
  dossiers: Dossier[];
}

export function isDatabase(value: unknown): value is Database {
  if (typeof value !== 'object' || value === null) return false;
  const db = value as Record<string, unknown>;
  return (
    db.version === DATABASE_VERSION &&
    ['operators', 'parts', 'events', 'reviews', 'notifications', 'dossiers'].every((key) =>
      Array.isArray(db[key]),
    )
  );
}
