import { createServices } from '@/services/create-services';
import { Repository, type Clock } from '@/services/repository';
import type { Result } from '@/services/result';
import { buildSeedDatabase } from '@/services/seed';
import { createMemoryStorage, type KeyValueStorage } from '@/services/storage';

/** Operadores do seed (ver src/data/operators.json). */
export const OP = {
  carlos: 'op-001', // Doca
  fernanda: 'op-002', // Doca
  rafael: 'op-003', // Meio
  juliana: 'op-004', // Meio
  marcos: 'op-005', // Destruição
  patricia: 'op-006', // Destruição
  ricardo: 'op-007', // Meio, inativo
} as const;

export const NOW = '2026-10-14T12:00:00-03:00';

export function createFlakyStorage(inner: KeyValueStorage) {
  const state = { failWrites: false };
  const storage: KeyValueStorage = {
    getItem: (key) => inner.getItem(key),
    removeItem: (key) => inner.removeItem(key),
    setItem: async (key, value) => {
      if (state.failWrites) throw new Error('disco cheio');
      await inner.setItem(key, value);
    },
  };
  return { storage, state };
}

/** Ambiente isolado: armazenamento em memória e relógio controlável. */
export function createHarness(options: { storage?: KeyValueStorage; start?: string } = {}) {
  let current = new Date(options.start ?? NOW);
  const clock: Clock = { now: () => new Date(current) };
  const storage = options.storage ?? createMemoryStorage();
  const repo = new Repository(storage, buildSeedDatabase, clock);
  const services = createServices(repo);

  return {
    services,
    repo,
    storage,
    clock,
    advanceMinutes(minutes: number) {
      current = new Date(current.getTime() + minutes * 60_000);
    },
    snapshot: () => repo.read((db) => db),
  };
}

export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Esperava sucesso, recebi ${result.error.code}: ${result.error.message}`);
  }
  return result.value;
}

export function errorCode(result: Result<unknown>): string {
  return result.ok ? 'OK' : result.error.code;
}
