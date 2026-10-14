import { STAGE_ORDER } from '@/constants/labels';
import type { DeadlineBand, Dossier, Part, PartEvent, Review, Stage } from '@/types/domain';
import { toLocalDateOnly } from '@/utils/dates';
import { DEADLINE_BAND_PRIORITY, getDaysRemaining, getDeadlineBand } from '@/utils/deadline';

import { canAccessPart, checkEligibility, findActiveOperator } from './guards';
import { fail, ok, type Result } from './result';
import type { Repository } from './repository';

export interface PartSummary {
  part: Part;
  daysRemaining: number;
  band: DeadlineBand;
}

export interface QueueSummary {
  /** Peças aguardando validação do operador. */
  pending: number;
  /** Peças com prazo urgente ou vencido. */
  urgent: number;
}

export type TimelineState = 'aprovada' | 'pendente' | 'em_revisao' | 'reprovada' | 'futura';

export interface TimelineStep {
  stage: Stage;
  state: TimelineState;
  /** Evento que aprovou a etapa, quando houver. */
  event: PartEvent | null;
}

export interface PartDetails extends PartSummary {
  timeline: TimelineStep[];
  events: PartEvent[];
  reviews: Review[];
  dossier: Dossier | null;
  operators: { id: string; name: string; registration: string }[];
}

export function summarize(part: Part, today: string): PartSummary {
  const daysRemaining = getDaysRemaining(part.destructionDeadline, today);
  return { part, daysRemaining, band: getDeadlineBand(daysRemaining) };
}

/** Fila: faixa de prazo primeiro (vencido, urgente, médio, leve); dentro da faixa, quem chegou antes na etapa. */
export function compareQueue(a: PartSummary, b: PartSummary): number {
  return (
    DEADLINE_BAND_PRIORITY[a.band] - DEADLINE_BAND_PRIORITY[b.band] ||
    a.part.stageEnteredAt.localeCompare(b.part.stageEnteredAt) ||
    a.part.number.localeCompare(b.part.number)
  );
}

function buildTimeline(part: Part, events: PartEvent[]): TimelineStep[] {
  const approvals = new Map<Stage, PartEvent>();
  for (const event of events) {
    const approved =
      (event.type === 'validacao' && event.result === 'aprovada') || event.type === 'conclusao';
    if (approved) approvals.set(event.stage, event); // eventos em ordem: o último prevalece
  }
  const currentIndex = STAGE_ORDER.indexOf(part.currentStage);

  return STAGE_ORDER.map((stage, index): TimelineStep => {
    const event = approvals.get(stage) ?? null;

    if (stage === part.currentStage) {
      if (part.status === 'concluida') return { stage, state: 'aprovada', event };
      if (part.status === 'em_revisao') return { stage, state: 'em_revisao', event };
      if (part.status === 'reprovada') return { stage, state: 'reprovada', event };
      return { stage, state: 'pendente', event };
    }
    if (index < currentIndex) return { stage, state: 'aprovada', event };
    return { stage, state: 'futura', event: null };
  });
}

export function createPartService(repo: Repository) {
  const today = () => toLocalDateOnly(repo.clock.now());

  const service = {
    /** Fila de validação do operador: só peças da etapa dele, prontas para validar, em ordem de prioridade. */
    listQueue(operatorId: string): Promise<Result<PartSummary[]>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        const now = today();
        const queue = db.parts
          .filter(
            (part) =>
              part.currentStage === operator.value.stage &&
              part.status === 'em_andamento' &&
              part.stageStatus === 'aguardando_validacao',
          )
          .map((part) => summarize(part, now))
          .sort(compareQueue);
        return ok(queue);
      });
    },

    /** Contadores da Home. "Urgente" inclui as peças vencidas. */
    async getQueueSummary(operatorId: string): Promise<Result<QueueSummary>> {
      const queue = await service.listQueue(operatorId);
      if (!queue.ok) return queue;
      return ok({
        pending: queue.value.length,
        urgent: queue.value.filter((item) => item.band === 'urgente' || item.band === 'vencido').length,
      });
    },

    /** Detalhes completos. Restrito à etapa do operador e às peças que ele já tratou. */
    getDetails(operatorId: string, partId: string): Promise<Result<PartDetails>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        const part = db.parts.find((p) => p.id === partId);
        if (!part) return fail('PECA_NAO_ENCONTRADA', 'Peça não encontrada.');
        if (!canAccessPart(db, operator.value, part)) {
          return fail('ACESSO_NEGADO', 'Você não tem acesso a esta peça.');
        }

        const events = db.events
          .filter((e) => e.partId === part.id)
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const operators = new Map<string, { id: string; name: string; registration: string }>();
        for (const e of events) {
          operators.set(e.operatorId, {
            id: e.operatorId,
            name: e.operatorName,
            registration: e.operatorRegistration,
          });
        }

        return ok<PartDetails>({
          ...summarize(part, today()),
          timeline: buildTimeline(part, events),
          events,
          reviews: db.reviews
            .filter((r) => r.partId === part.id)
            .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)),
          dossier: db.dossiers.find((d) => d.partId === part.id) ?? null,
          operators: [...operators.values()],
        });
      });
    },

    /**
     * Consulta pelo número impresso (digitado ou lido por OCR) para validar.
     * Só devolve a peça se ela puder ser validada por este operador agora.
     */
    lookupForValidation(operatorId: string, number: string): Promise<Result<PartSummary>> {
      return repo.read((db) => {
        const operator = findActiveOperator(db, operatorId);
        if (!operator.ok) return operator;
        const normalized = number.trim();
        if (!/^\d{4,20}$/.test(normalized)) {
          return fail('IDENTIFICADOR_INVALIDO', 'O número da peça deve conter apenas dígitos.');
        }
        const part = db.parts.find((p) => p.number === normalized);
        if (!part) {
          return fail('PECA_NAO_ENCONTRADA', `Nenhuma peça com o número ${normalized}.`);
        }
        const eligible = checkEligibility(operator.value, part);
        if (!eligible.ok) return eligible;
        return ok(summarize(part, today()));
      });
    },
  };

  return service;
}
