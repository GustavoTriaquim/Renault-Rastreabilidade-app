import { createHarness, errorCode, OP, unwrap } from './harness';

describe('abrir notificação', () => {
  it('marca como lida e devolve peça e revisão relacionadas', async () => {
    const h = createHarness();
    const { services } = h;
    const { review } = unwrap(
      await services.reviews.requestReview(OP.fernanda, 'part-002', {
        reason: 'outro',
        justification: 'Etiqueta ilegível.',
      }),
    );
    h.advanceMinutes(3);
    unwrap(await services.reviews.decide(OP.fernanda, review.id));

    const list = unwrap(await services.notifications.listForOperator(OP.fernanda));
    const decided = list[0];
    expect(decided.read).toBe(false);
    const unread = unwrap(await services.notifications.countUnread(OP.fernanda));

    const details = unwrap(await services.notifications.open(OP.fernanda, decided.id));
    expect(details.notification.read).toBe(true);
    expect(details.part?.part.number).toBe('31759204');
    expect(details.review).toMatchObject({
      requestedByOperatorName: 'Fernanda Lima',
      justification: 'Etiqueta ilegível.',
    });
    expect(details.review?.decision?.decidedByOperatorName).toBe('Análise de Qualidade (simulada)');
    expect(details.partAccessible).toBe(true);
    expect(unwrap(await services.notifications.countUnread(OP.fernanda))).toBe(unread - 1);

    // idempotente: abrir de novo não altera a contagem
    unwrap(await services.notifications.open(OP.fernanda, decided.id));
    expect(unwrap(await services.notifications.countUnread(OP.fernanda))).toBe(unread - 1);
  });

  it('só o destinatário consegue abrir', async () => {
    const h = createHarness();
    const mine = unwrap(await h.services.notifications.listForOperator(OP.rafael))[0];
    expect(errorCode(await h.services.notifications.open(OP.carlos, mine.id))).toBe('NOTIFICACAO_NAO_ENCONTRADA');
    expect(errorCode(await h.services.notifications.open(OP.rafael, 'ntf-999'))).toBe('NOTIFICACAO_NAO_ENCONTRADA');
  });

  it('notificação de peça disponível não traz revisão', async () => {
    const h = createHarness();
    const list = unwrap(await h.services.notifications.listForOperator(OP.rafael));
    const available = list.find((n) => n.type === 'peca_disponivel');
    expect(available).toBeDefined();
    const details = unwrap(await h.services.notifications.open(OP.rafael, available?.id ?? ''));
    expect(details.review).toBeNull();
    expect(details.part).not.toBeNull();
  });
});
