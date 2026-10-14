import type { Dossier, Part } from '@/types/domain';

import { buildDossier } from './dossier-builder';
import type { Database } from './database';
import { canAccessPart, findActiveOperator } from './guards';
import { fail, ok, type Result } from './result';
import type { Repository } from './repository';

/**
 * Garante o dossiê de uma peça concluída, dentro de uma transação.
 * Idempotente: se o dossiê já existe, é reaproveitado e nada é duplicado.
 */
export function ensureDossier(
  draft: Database,
  part: Part,
  generatedAt: string,
): { dossier: Dossier; created: boolean } {
  const existing = draft.dossiers.find((d) => d.partId === part.id);
  if (existing) {
    part.dossierId = existing.id;
    return { dossier: existing, created: false };
  }
  const dossier = buildDossier({
    part,
    events: draft.events,
    reviews: draft.reviews,
    completedAt: part.completedAt ?? generatedAt,
    generatedAt,
  });
  draft.dossiers.push(dossier);
  part.dossierId = dossier.id;
  return { dossier, created: true };
}

export function createDossierService(repo: Repository) {
  return {
    /** Gera (ou recupera) o dossiê de uma peça já concluída. Chamadas repetidas devolvem o mesmo dossiê. */
    generateForPart(partId: string): Promise<Result<{ dossier: Dossier; created: boolean }>> {
      return repo.transact((draft) => {
        const part = draft.parts.find((p) => p.id === partId);
        if (!part) return fail('PECA_NAO_ENCONTRADA', 'Peça não encontrada.');
        if (part.status !== 'concluida') {
          return fail('PECA_NAO_CONCLUIDA', `A peça ${part.number} ainda não foi concluída.`);
        }
        return ok(ensureDossier(draft, part, repo.clock.now().toISOString()));
      });
    },

    /** Dossiê de uma peça. Restrito a operadores que a trataram ou da etapa dela. */
    getByPart(operatorId: string, partId: string): Promise<Result<Dossier>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        const part = db.parts.find((p) => p.id === partId);
        if (!part) return fail('PECA_NAO_ENCONTRADA', 'Peça não encontrada.');
        if (!canAccessPart(db, operator.value, part)) {
          return fail('ACESSO_NEGADO', 'Você não tem acesso a esta peça.');
        }
        if (part.status !== 'concluida') {
          return fail('PECA_NAO_CONCLUIDA', `A peça ${part.number} ainda não foi concluída.`);
        }
        const dossier = db.dossiers.find((d) => d.partId === part.id);
        if (!dossier) return fail('DOSSIE_NAO_ENCONTRADO', 'Dossiê não encontrado.');
        return ok(dossier);
      });
    },
  };
}
