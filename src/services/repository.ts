import { DATABASE_VERSION, isDatabase, type Database } from './database';
import { fail, type Result } from './result';
import type { KeyValueStorage } from './storage';

export const STORAGE_KEY = 'renault-tracer/database';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

/** Cópia profunda (dados são JSON puro). Evita que a interface altere o estado interno. */
function cloneValue<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/**
 * Repositório dos dados simulados.
 *
 * - Carrega o estado persistido; na primeira execução (ou se estiver corrompido)
 *   monta os dados iniciais e já os persiste.
 * - Toda leitura e escrita passa por uma fila: duas operações nunca se
 *   sobrepõem, então um toque duplo não registra a mesma validação duas vezes.
 * - `transact` trabalha numa cópia: se a regra falhar ou a gravação falhar,
 *   nada muda (rollback).
 */
export class Repository {
  private db: Database | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly buildSeed: (now: Date) => Database,
    readonly clock: Clock = systemClock,
  ) {}

  /** Leitura consistente (devolve cópias): nunca enxerga uma transação pela metade. */
  read<T>(selector: (db: Readonly<Database>) => T): Promise<T> {
    return this.enqueue(async () => cloneValue(selector(await this.load())));
  }

  /** Escrita atômica. `mutate` altera o rascunho e devolve um `Result`; só `ok` é gravado. */
  transact<T>(mutate: (draft: Database) => Result<T>): Promise<Result<T>> {
    return this.enqueue(async () => {
      const current = await this.load();
      const draft = JSON.parse(JSON.stringify(current)) as Database;
      const result = mutate(draft);
      if (!result.ok) return result;
      try {
        await this.storage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch {
        return fail<T>('ERRO_ARMAZENAMENTO', 'Não foi possível salvar os dados. Tente novamente.');
      }
      this.db = draft;
      return cloneValue(result);
    });
  }

  /** Descarta o estado atual e volta aos dados iniciais (uso em demonstrações e testes). */
  reset(): Promise<void> {
    return this.enqueue(async () => {
      this.db = null;
      await this.storage.removeItem(STORAGE_KEY);
      await this.load();
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async load(): Promise<Database> {
    if (this.db) return this.db;

    const raw = await this.storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isDatabase(parsed)) {
          this.db = parsed;
          return parsed;
        }
      } catch {
        // dados corrompidos: recomeça dos dados iniciais
      }
    }

    const seeded = this.buildSeed(this.clock.now());
    if (seeded.version !== DATABASE_VERSION) {
      throw new Error('Versão do seed diferente de DATABASE_VERSION.');
    }
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    this.db = seeded;
    return seeded;
  }
}
