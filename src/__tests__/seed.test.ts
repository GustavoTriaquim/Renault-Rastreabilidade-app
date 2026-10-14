import { STAGE_ORDER } from '@/constants/labels';
import { buildSeedDatabase } from '@/services/seed';
import { toLocalDateOnly } from '@/utils/dates';
import { calculateDestructionDeadline, getDaysRemaining, getDeadlineBand } from '@/utils/deadline';

import { NOW } from './harness';

const db = buildSeedDatabase(new Date(NOW));
const today = toLocalDateOnly(new Date(NOW));

describe('dados iniciais', () => {
  it('é determinístico para o mesmo instante', () => {
    expect(buildSeedDatabase(new Date(NOW))).toEqual(db);
  });

  it('tem operadores de todas as etapas, matrículas numéricas e únicas', () => {
    for (const stage of STAGE_ORDER) {
      expect(db.operators.filter((o) => o.stage === stage && o.active).length).toBeGreaterThanOrEqual(2);
    }
    expect(db.operators.some((o) => !o.active)).toBe(true);
    expect(db.operators.length).toBeGreaterThanOrEqual(6);
    const registrations = db.operators.map((o) => o.registration);
    expect(new Set(registrations).size).toBe(registrations.length);
    for (const r of registrations) expect(r).toMatch(/^\d+$/);
  });

  it('números de peça são só dígitos, únicos e diferentes das matrículas (evita ambiguidade no OCR)', () => {
    const numbers = db.parts.map((p) => p.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const n of numbers) expect(n).toMatch(/^\d{8}$/);
    const registrations = new Set(db.operators.map((o) => o.registration));
    for (const n of numbers) expect(registrations.has(n)).toBe(false);
  });

  it('o prazo de cada peça é a chegada + 6 meses-calendário', () => {
    for (const part of db.parts) {
      expect(part.destructionDeadline).toBe(calculateDestructionDeadline(part.arrivalDate));
    }
  });

  it('cobre todos os cenários: três etapas, as quatro faixas de prazo, revisão e conclusão', () => {
    const pending = db.parts.filter((p) => p.status === 'em_andamento');
    for (const stage of STAGE_ORDER) {
      expect(pending.some((p) => p.currentStage === stage)).toBe(true);
    }
    const bands = new Set(
      pending.map((p) => getDeadlineBand(getDaysRemaining(p.destructionDeadline, today))),
    );
    expect([...bands].sort()).toEqual(['leve', 'medio', 'urgente', 'vencido']);
    expect(db.parts.some((p) => p.status === 'em_revisao')).toBe(true);
    expect(db.parts.some((p) => p.status === 'concluida')).toBe(true);
    expect(db.notifications.some((n) => n.read)).toBe(true);
    expect(db.notifications.some((n) => !n.read)).toBe(true);
  });

  it('o prazo vencido não altera a etapa nem o status operacional da peça', () => {
    const overdue = db.parts.filter(
      (p) => getDaysRemaining(p.destructionDeadline, today) < 0 && p.status === 'em_andamento',
    );
    expect(overdue.length).toBeGreaterThan(0);
    for (const part of overdue) {
      expect(part.stageStatus).toBe('aguardando_validacao');
    }
  });

  it('eventos, revisões e peças são consistentes entre si', () => {
    const operatorById = new Map(db.operators.map((o) => [o.id, o]));

    for (const event of db.events) {
      const part = db.parts.find((p) => p.id === event.partId);
      expect(part).toBeDefined();
      expect(event.partNumber).toBe(part?.number);
      expect(operatorById.get(event.operatorId)?.stage).toBe(event.stage);
      expect(event.timestamp.slice(0, 10) >= (part?.arrivalDate ?? '')).toBe(true);
    }

    for (const part of db.parts) {
      const events = db.events
        .filter((e) => e.partId === part.id)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const approvedStages = events
        .filter((e) => e.type === 'validacao' || e.type === 'conclusao')
        .map((e) => e.stage);
      const currentIndex = STAGE_ORDER.indexOf(part.currentStage);

      // etapas anteriores à atual foram todas aprovadas, na ordem
      expect(approvedStages.slice(0, currentIndex)).toEqual(STAGE_ORDER.slice(0, currentIndex));

      if (part.status === 'concluida') {
        expect(events.at(-1)?.type).toBe('conclusao');
        expect(part.completedAt).toBe(events.at(-1)?.timestamp);
        expect(part.dossierId).not.toBeNull();
        expect(db.dossiers.filter((d) => d.partId === part.id)).toHaveLength(1);
      } else {
        expect(part.completedAt).toBeNull();
        expect(part.dossierId).toBeNull();
      }

      if (part.status === 'em_revisao') {
        expect(db.reviews.filter((r) => r.partId === part.id && r.status === 'em_analise')).toHaveLength(1);
        expect(events.at(-1)?.type).toBe('revisao_solicitada');
      }

      // entrada na etapa atual coincide com o último avanço (ou com a revisão pedida na etapa)
      const lastAdvance = [...events].reverse().find((e) => e.type === 'validacao');
      if (lastAdvance && part.currentStage !== 'doca') {
        expect(part.stageEnteredAt).toBe(lastAdvance.timestamp);
      }
    }

    for (const review of db.reviews) {
      expect(operatorById.get(review.requestedByOperatorId)?.stage).toBe(review.stage);
    }
  });

  it('notificações apontam para destinatários da etapa certa e dossiês trazem a trilha completa', () => {
    for (const n of db.notifications) {
      const recipient = db.operators.find((o) => o.id === n.recipientOperatorId);
      const part = db.parts.find((p) => p.id === n.partId);
      expect(recipient?.active).toBe(true);
      expect(part).toBeDefined();
      expect(n.partNumber).toBe(part?.number);
    }
    for (const dossier of db.dossiers) {
      expect(dossier.stages.map((s) => s.stage)).toEqual([...STAGE_ORDER]);
      expect(dossier.completedAt).toBe(dossier.stages.at(-1)?.timestamp);
    }
  });
});
