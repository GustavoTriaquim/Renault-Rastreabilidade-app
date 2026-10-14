import type { PartEvent } from '@/types/domain';

import { canAccessPart, findActiveOperator } from './guards';
import { fail, ok, type Result } from './result';
import type { Repository } from './repository';

export function createEventService(repo: Repository) {
  return {
    /** Histórico do operador: eventos que ele registrou (e as decisões das revisões que pediu), do mais recente ao mais antigo. */
    listByOperator(operatorId: string): Promise<Result<PartEvent[]>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        // Decisões de revisão são registradas pela análise simulada, mas pertencem
        // ao histórico de quem solicitou a revisão.
        const requestedReviews = new Set(
          db.reviews
            .filter((review) => review.requestedByOperatorId === operator.value.id)
            .map((review) => review.partId),
        );
        return ok(
          db.events
            .filter(
              (event) =>
                event.operatorId === operator.value.id ||
                (event.type === 'revisao_decidida' && requestedReviews.has(event.partId)),
            )
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)),
        );
      });
    },

    /** Trilha completa de uma peça (de qualquer operador), em ordem cronológica. */
    listByPart(operatorId: string, partId: string): Promise<Result<PartEvent[]>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        const part = db.parts.find((p) => p.id === partId);
        if (!part) return fail('PECA_NAO_ENCONTRADA', 'Peça não encontrada.');
        if (!canAccessPart(db, operator.value, part)) {
          return fail('ACESSO_NEGADO', 'Você não tem acesso a esta peça.');
        }
        return ok(
          db.events
            .filter((event) => event.partId === part.id)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)),
        );
      });
    },
  };
}
