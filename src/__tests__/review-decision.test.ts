import { createHarness, errorCode, OP, unwrap } from './harness';

// Números do seed (src/data/parts.json)
const DOCA_A = { id: 'part-002', number: '31759204' };
const DOCA_B = { id: 'part-003', number: '47203518' };
const DOCA_C = { id: 'part-001', number: '20481937' };

async function requestReview(
  h: ReturnType<typeof createHarness>,
  operatorId: string,
  part: { id: string },
) {
  h.advanceMinutes(1);
  return unwrap(
    await h.services.reviews.requestReview(operatorId, part.id, {
      reason: 'peca_quebrada',
      justification: 'Carcaça trincada.',
    }),
  );
}

describe('decisão das revisões (simulada, alternando)', () => {
  it('a primeira revisão é aprovada e a peça volta para o Meio', async () => {
    const h = createHarness();
    const { review } = await requestReview(h, OP.fernanda, DOCA_A);
    h.advanceMinutes(5);

    const outcome = unwrap(await h.services.reviews.decide(OP.fernanda, review.id));
    expect(outcome.review.status).toBe('aprovada_apos_revisao');
    expect(outcome.review.decision?.outcome).toBe('aprovada');
    expect(outcome.review.decision?.destinationStage).toBe('meio');
    expect(outcome.review.decision?.decidedByOperatorName).toBe('Análise de Qualidade (simulada)');
    expect(outcome.part).toMatchObject({
      status: 'em_andamento',
      stageStatus: 'aguardando_validacao',
      currentStage: 'meio',
    });

    // a peça entra na fila do Meio e sai das outras
    const meioQueue = unwrap(await h.services.parts.listQueue(OP.rafael));
    expect(meioQueue.some((item) => item.part.id === DOCA_A.id)).toBe(true);
    const docaQueue = unwrap(await h.services.parts.listQueue(OP.carlos));
    expect(docaQueue.some((item) => item.part.id === DOCA_A.id)).toBe(false);
  });

  it('a segunda é reprovada: a peça fica bloqueada e não é concluída', async () => {
    const h = createHarness();
    const first = await requestReview(h, OP.fernanda, DOCA_A);
    unwrap(await h.services.reviews.decide(OP.fernanda, first.review.id));
    const second = await requestReview(h, OP.fernanda, DOCA_B);
    h.advanceMinutes(5);

    const outcome = unwrap(await h.services.reviews.decide(OP.fernanda, second.review.id));
    expect(outcome.review.status).toBe('reprovada_apos_revisao');
    expect(outcome.review.decision?.destinationStage).toBeNull();
    expect(outcome.part).toMatchObject({ status: 'reprovada', stageStatus: 'reprovada', currentStage: 'doca' });
    expect(outcome.part.completedAt).toBeNull();

    // bloqueada: ninguém valida nem pede nova revisão
    expect(errorCode(await h.services.validation.validate(OP.carlos, DOCA_B.id))).toBe('PECA_REPROVADA');
    expect(
      errorCode(
        await h.services.reviews.requestReview(OP.carlos, DOCA_B.id, { reason: 'outro', justification: 'x' }),
      ),
    ).toBe('PECA_REPROVADA');
  });

  it('segue alternando: aprovada, reprovada, aprovada', async () => {
    const h = createHarness();
    const results: string[] = [];
    for (const part of [DOCA_A, DOCA_B, DOCA_C]) {
      const { review } = await requestReview(h, OP.fernanda, part);
      h.advanceMinutes(5);
      results.push(unwrap(await h.services.reviews.decide(OP.fernanda, review.id)).review.status);
    }
    expect(results).toEqual(['aprovada_apos_revisao', 'reprovada_apos_revisao', 'aprovada_apos_revisao']);
  });

  it('preserva a justificativa original e o histórico, e registra o evento da decisão', async () => {
    const h = createHarness();
    const { review } = await requestReview(h, OP.fernanda, DOCA_A);
    h.advanceMinutes(5);
    unwrap(await h.services.reviews.decide(OP.fernanda, review.id));

    const db = await h.snapshot();
    const stored = db.reviews.find((r) => r.id === review.id);
    expect(stored?.justification).toBe('Carcaça trincada.');
    expect(stored?.requestedByOperatorName).toBe('Fernanda Lima');

    const trail = unwrap(await h.services.events.listByPart(OP.fernanda, DOCA_A.id));
    expect(trail.map((e) => e.type)).toEqual(['revisao_solicitada', 'revisao_decidida']);
    expect(trail[1]).toMatchObject({ result: 'aprovada_apos_revisao', operatorName: 'Análise de Qualidade (simulada)' });

    // a decisão aparece no histórico de quem pediu a revisão
    const history = unwrap(await h.services.events.listByOperator(OP.fernanda));
    expect(history[0].type).toBe('revisao_decidida');
    // e não no de operadores sem relação com a revisão
    const others = unwrap(await h.services.events.listByOperator(OP.carlos));
    expect(others.some((e) => e.type === 'revisao_decidida')).toBe(false);
  });

  it('gera as notificações certas: quem pediu e a etapa que recebe a peça de volta', async () => {
    const h = createHarness();
    const { review } = await requestReview(h, OP.fernanda, DOCA_A);
    const before = {
      fernanda: unwrap(await h.services.notifications.listForOperator(OP.fernanda)).length,
      rafael: unwrap(await h.services.notifications.listForOperator(OP.rafael)).length,
      juliana: unwrap(await h.services.notifications.listForOperator(OP.juliana)).length,
      ricardo: (await h.snapshot()).notifications.filter((n) => n.recipientOperatorId === OP.ricardo).length,
      carlos: unwrap(await h.services.notifications.listForOperator(OP.carlos)).length,
    };
    h.advanceMinutes(5);
    unwrap(await h.services.reviews.decide(OP.fernanda, review.id));

    const fernanda = unwrap(await h.services.notifications.listForOperator(OP.fernanda));
    expect(fernanda).toHaveLength(before.fernanda + 1);
    expect(fernanda[0]).toMatchObject({ type: 'revisao_atualizada', reviewId: review.id });

    const rafael = unwrap(await h.services.notifications.listForOperator(OP.rafael));
    const juliana = unwrap(await h.services.notifications.listForOperator(OP.juliana));
    expect(rafael).toHaveLength(before.rafael + 1);
    expect(juliana).toHaveLength(before.juliana + 1);
    expect(rafael[0]).toMatchObject({ type: 'revisao_retornou', partNumber: DOCA_A.number });
    // operador inativo e etapas sem relação não recebem
    expect((await h.snapshot()).notifications.filter((n) => n.recipientOperatorId === OP.ricardo)).toHaveLength(
      before.ricardo,
    );
    expect(unwrap(await h.services.notifications.listForOperator(OP.carlos))).toHaveLength(before.carlos);
  });

  it('revisão reprovada notifica só quem pediu, como peça reprovada', async () => {
    const h = createHarness();
    const first = await requestReview(h, OP.fernanda, DOCA_A);
    unwrap(await h.services.reviews.decide(OP.fernanda, first.review.id));
    const second = await requestReview(h, OP.fernanda, DOCA_B);
    const rafaelBefore = unwrap(await h.services.notifications.listForOperator(OP.rafael)).length;
    h.advanceMinutes(5);
    unwrap(await h.services.reviews.decide(OP.fernanda, second.review.id));

    const fernanda = unwrap(await h.services.notifications.listForOperator(OP.fernanda));
    expect(fernanda[0]).toMatchObject({ type: 'peca_reprovada', partNumber: DOCA_B.number });
    expect(unwrap(await h.services.notifications.listForOperator(OP.rafael))).toHaveLength(rafaelBefore);
  });

  it('quando o solicitante é da etapa de retorno, recebe uma única notificação', async () => {
    const h = createHarness();
    // Rafael (Meio) pediu a rev-001 do seed
    const before = unwrap(await h.services.notifications.listForOperator(OP.rafael)).length;
    unwrap(await h.services.reviews.decide(OP.rafael, 'rev-001'));
    const after = unwrap(await h.services.notifications.listForOperator(OP.rafael));
    expect(after).toHaveLength(before + 1);
    expect(after[0].type).toBe('revisao_retornou');
  });

  it('não decide duas vezes nem por quem não solicitou; falhas não gravam nada', async () => {
    const h = createHarness();
    const { review } = await requestReview(h, OP.fernanda, DOCA_A);
    expect(errorCode(await h.services.reviews.decide(OP.carlos, review.id))).toBe('REVISAO_NAO_ENCONTRADA');
    expect(errorCode(await h.services.reviews.decide(OP.fernanda, 'rev-999'))).toBe('REVISAO_NAO_ENCONTRADA');
    unwrap(await h.services.reviews.decide(OP.fernanda, review.id));

    const before = await h.snapshot();
    expect(errorCode(await h.services.reviews.decide(OP.fernanda, review.id))).toBe('REVISAO_JA_DECIDIDA');
    expect(await h.snapshot()).toEqual(before);
  });

  it('peça aprovada na revisão segue o fluxo até a conclusão e o dossiê guarda a revisão', async () => {
    const h = createHarness();
    const { review } = await requestReview(h, OP.fernanda, DOCA_A);
    h.advanceMinutes(5);
    unwrap(await h.services.reviews.decide(OP.fernanda, review.id));

    h.advanceMinutes(5);
    unwrap(await h.services.validation.validate(OP.rafael, DOCA_A.id));
    h.advanceMinutes(5);
    const done = unwrap(await h.services.validation.validate(OP.marcos, DOCA_A.id));
    expect(done.completed).toBe(true);

    const dossier = unwrap(await h.services.dossiers.getByPart(OP.marcos, DOCA_A.id));
    expect(dossier.reviews).toHaveLength(1);
    expect(dossier.reviews[0].decision?.outcome).toBe('aprovada');
    expect(dossier.stages.map((s) => s.stage)).toEqual(['meio', 'destruicao']);
  });
});
