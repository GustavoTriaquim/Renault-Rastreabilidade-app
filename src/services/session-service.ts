import type { Operator } from '@/types/domain';

import type { createOperatorService } from './operator-service';
import type { Result } from './result';
import type { KeyValueStorage } from './storage';

export const SESSION_KEY = 'renault-tracer/session';

type OperatorService = ReturnType<typeof createOperatorService>;

/**
 * Sessão do operador. Guarda apenas o ID do operador: a cada abertura do app o
 * operador é buscado de novo e revalidado (existe e segue ativo).
 */
export function createSessionService(
  storage: KeyValueStorage,
  operators: OperatorService,
  options: { persist: boolean } = { persist: true },
) {
  async function clear() {
    try {
      await storage.removeItem(SESSION_KEY);
    } catch {
      // sem sessão salva é o estado desejado; falha de limpeza não deve travar o logout
    }
  }

  return {
    /** Autentica pela matrícula e, se configurado, lembra o operador. */
    async signIn(registration: string): Promise<Result<Operator>> {
      const result = await operators.authenticate(registration);
      if (result.ok && options.persist) {
        try {
          await storage.setItem(SESSION_KEY, JSON.stringify({ operatorId: result.value.id }));
        } catch {
          // o login vale mesmo sem conseguir salvar a sessão
        }
      }
      return result;
    },

    /** Recupera o operador da sessão salva, ou `null` se não houver sessão válida. */
    async restore(): Promise<Operator | null> {
      if (!options.persist) {
        await clear();
        return null;
      }

      let operatorId: string | null = null;
      try {
        const raw = await storage.getItem(SESSION_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (typeof parsed === 'object' && parsed !== null) {
          const candidate = (parsed as Record<string, unknown>).operatorId;
          if (typeof candidate === 'string' && candidate.length > 0) operatorId = candidate;
        }
      } catch {
        // dado ilegível: trata como sem sessão
      }
      if (!operatorId) {
        await clear();
        return null;
      }

      const result = await operators.getActiveById(operatorId);
      if (!result.ok) {
        await clear();
        return null;
      }
      return result.value;
    },

    /** Encerra a sessão. */
    signOut: clear,
  };
}
