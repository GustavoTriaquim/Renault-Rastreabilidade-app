import dossiersJson from '@/data/dossiers.json';
import eventsJson from '@/data/events.json';
import notificationsJson from '@/data/notifications.json';
import operatorsJson from '@/data/operators.json';
import partsJson from '@/data/parts.json';
import reviewsJson from '@/data/reviews.json';
import type {
  SeedDossier,
  SeedEvent,
  SeedNotification,
  SeedOperator,
  SeedPart,
  SeedReview,
} from '@/data/seed-types';
import type { AppNotification, Operator, Part, PartEvent, Review } from '@/types/domain';
import { addDays, toLocalDateOnly } from '@/utils/dates';
import { calculateDestructionDeadline } from '@/utils/deadline';

import { DATABASE_VERSION, type Database } from './database';
import { buildDossier } from './dossier-builder';
import { partAvailableContent, reviewRegisteredContent } from './notification-factory';

function must<T>(value: T | undefined, description: string): T {
  if (value === undefined) {
    throw new Error(`Seed inconsistente: ${description} não encontrado.`);
  }
  return value;
}

/**
 * Converte os JSON iniciais (datas relativas) no estado real da simulação,
 * ancorado em `now`. Só roda na primeira execução ou após um reset.
 */
export function buildSeedDatabase(now: Date): Database {
  const isoMinutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const today = toLocalDateOnly(now);

  const operators: Operator[] = (operatorsJson as SeedOperator[]).map((o) => ({ ...o }));
  const operatorById = new Map(operators.map((o) => [o.id, o]));

  const parts: Part[] = (partsJson as SeedPart[]).map((p) => {
    const arrivalDate = addDays(today, -p.arrivalDaysAgo);
    return {
      id: p.id,
      number: p.number,
      imageKey: p.imageKey,
      dock: p.dock,
      arrivalDate,
      destructionDeadline: calculateDestructionDeadline(arrivalDate),
      currentStage: p.currentStage,
      stageEnteredAt: isoMinutesAgo(p.stageEnteredMinutesAgo),
      status: p.status,
      stageStatus: p.stageStatus,
      completedAt: p.completedMinutesAgo === null ? null : isoMinutesAgo(p.completedMinutesAgo),
      dossierId: p.dossierId,
    };
  });
  const partById = new Map(parts.map((p) => [p.id, p]));

  const events: PartEvent[] = (eventsJson as SeedEvent[]).map((e) => {
    const part = must(partById.get(e.partId), `peça ${e.partId} do evento ${e.id}`);
    const operator = must(operatorById.get(e.operatorId), `operador ${e.operatorId} do evento ${e.id}`);
    return {
      id: e.id,
      partId: part.id,
      partNumber: part.number,
      operatorId: operator.id,
      operatorName: operator.name,
      operatorRegistration: operator.registration,
      stage: e.stage,
      type: e.type,
      result: e.result,
      timestamp: isoMinutesAgo(e.minutesAgo),
      note: e.note,
    };
  });
  const eventById = new Map(events.map((e) => [e.id, e]));

  const reviews: Review[] = (reviewsJson as SeedReview[]).map((r) => {
    const part = must(partById.get(r.partId), `peça ${r.partId} da revisão ${r.id}`);
    const operator = must(operatorById.get(r.requestedByOperatorId), `operador da revisão ${r.id}`);
    return {
      id: r.id,
      partId: part.id,
      partNumber: part.number,
      requestedByOperatorId: operator.id,
      requestedByOperatorName: operator.name,
      stage: r.stage,
      reason: r.reason,
      justification: r.justification,
      requestedAt: isoMinutesAgo(r.requestedMinutesAgo),
      status: r.status,
      decision: r.decision,
    };
  });

  const notifications: AppNotification[] = (notificationsJson as SeedNotification[]).map((n) => {
    const part = must(partById.get(n.partId), `peça ${n.partId} da notificação ${n.id}`);
    const source = must(eventById.get(n.sourceEventId), `evento ${n.sourceEventId} da notificação ${n.id}`);
    const content =
      n.type === 'revisao_atualizada'
        ? reviewRegisteredContent({ partNumber: part.number, stage: source.stage })
        : partAvailableContent({
            partNumber: part.number,
            fromStage: source.stage,
            toStage: source.stage === 'doca' ? 'meio' : 'destruicao',
            approvedByName: source.operatorName,
          });
    return {
      id: n.id,
      recipientOperatorId: n.recipientOperatorId,
      type: content.type,
      title: content.title,
      summary: content.summary,
      createdAt: isoMinutesAgo(n.minutesAgo),
      partId: part.id,
      partNumber: part.number,
      reviewId: n.reviewId,
      read: n.read,
    };
  });

  const dossiers = (dossiersJson as SeedDossier[]).map((d) => {
    const part = must(partById.get(d.partId), `peça ${d.partId} do dossiê ${d.id}`);
    return buildDossier({
      part,
      events,
      reviews,
      completedAt: must(part.completedAt ?? undefined, `data de conclusão da peça ${part.id}`),
      generatedAt: isoMinutesAgo(d.generatedMinutesAgo),
    });
  });

  return { version: DATABASE_VERSION, operators, parts, events, reviews, notifications, dossiers };
}
