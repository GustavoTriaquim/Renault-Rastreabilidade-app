import { Repository } from '@/services/repository';
import { buildSeedDatabase } from '@/services/seed';
import { createServices } from '@/services/create-services';
import { createMemoryStorage } from '@/services/storage';

import { createFlakyStorage, createHarness, errorCode, OP, unwrap } from './harness';

// Números do seed (src/data/parts.json)
const PART = {
  docaLeve: { id: 'part-001', number: '20481937' },
  docaMedio: { id: 'part-002', number: '31759204' },
  docaUrgente: { id: 'part-003', number: '47203518' },
  docaVencida: { id: 'part-004', number: '58316072' },
  docaUrgenteAntiga: { id: 'part-014', number: '91826374' },
  meioLeve: { id: 'part-005', number: '62947185' },
  meioUrgente: { id: 'part-006', number: '73850621' },
  destruicaoMedio: { id: 'part-007', number: '84617309' },
  destruicaoUrgente: { id: 'part-008', number: '95173846' },
  meioEmRevisao: { id: 'part-010', number: '27491638' },
  concluida: { id: 'part-012', number: '49618205' },
} as const;

describe('autenticação por matrícula', () => {
  const { services } = createHarness();

  it('aceita matrícula válida (com espaços nas pontas)', async () => {
    const operator = unwrap(await services.operators.authenticate(' 483917 '));
    expect(operator.name).toBe('Carlos Almeida');
    expect(operator.stage).toBe('doca');
  });

  it('rejeita formato inválido, matrícula inexistente e operador inativo', async () => {
    expect(errorCode(await services.operators.authenticate(''))).toBe('MATRICULA_INVALIDA');
    expect(errorCode(await services.operators.authenticate('48A917'))).toBe('MATRICULA_INVALIDA');
    expect(errorCode(await services.operators.authenticate('123'))).toBe('MATRICULA_INVALIDA');
    expect(errorCode(await services.operators.authenticate('999999'))).toBe('MATRICULA_INEXISTENTE');
    expect(errorCode(await services.operators.authenticate('358071'))).toBe('OPERADOR_INATIVO');
  });

  it('reidrata a sessão por ID e recusa IDs desconhecidos ou inativos', async () => {
    expect(unwrap(await services.operators.getActiveById(OP.rafael)).name).toBe('Rafael Souza');
    expect(errorCode(await services.operators.getActiveById('op-999'))).toBe('OPERADOR_NAO_ENCONTRADO');
    expect(errorCode(await services.operators.getActiveById(OP.ricardo))).toBe('OPERADOR_INATIVO');
  });
});

describe('fila do operador (Home)', () => {
  const { services } = createHarness();

  it('mostra só peças da etapa do operador, urgência primeiro e, dentro da faixa, quem chegou antes', async () => {
    const queue = unwrap(await services.parts.listQueue(OP.carlos));
    expect(queue.map((item) => item.part.number)).toEqual([
      PART.docaVencida.number, // vencida
      PART.docaUrgenteAntiga.number, // urgente, entrou na etapa há ~3 dias
      PART.docaUrgente.number, // urgente, entrou há ~1 dia
      PART.docaMedio.number, // médio
      PART.docaLeve.number, // leve, mesmo tendo chegado à etapa antes de todas
    ]);
    expect(queue.map((item) => item.band)).toEqual(['vencido', 'urgente', 'urgente', 'medio', 'leve']);
    expect(queue.every((item) => item.part.currentStage === 'doca')).toBe(true);
  });

  it('a peça leve que chegou primeiro não passa na frente de uma urgente', async () => {
    const queue = unwrap(await services.parts.listQueue(OP.fernanda));
    const leve = queue.find((i) => i.part.number === PART.docaLeve.number);
    const urgente = queue.find((i) => i.part.number === PART.docaUrgente.number);
    expect(leve && urgente).toBeTruthy();
    expect(leve!.part.stageEnteredAt < urgente!.part.stageEnteredAt).toBe(true);
    expect(queue.indexOf(urgente!)).toBeLessThan(queue.indexOf(leve!));
  });

  it('o Meio vê apenas as suas peças; peça em revisão sai da fila', async () => {
    const queue = unwrap(await services.parts.listQueue(OP.rafael));
    expect(queue.map((i) => i.part.number)).toEqual([PART.meioUrgente.number, PART.meioLeve.number]);
    expect(queue.some((i) => i.part.number === PART.meioEmRevisao.number)).toBe(false);
  });

  it('contadores: pendentes e urgentes (urgente + vencida)', async () => {
    expect(unwrap(await services.parts.getQueueSummary(OP.carlos))).toEqual({ pending: 5, urgent: 3 });
    expect(unwrap(await services.parts.getQueueSummary(OP.marcos))).toEqual({ pending: 3, urgent: 1 });
  });

  it('operador inativo não consulta a fila', async () => {
    expect(errorCode(await services.parts.listQueue(OP.ricardo))).toBe('OPERADOR_INATIVO');
  });
});

describe('visibilidade de peças por etapa', () => {
  const { services } = createHarness();

  it('bloqueia peças de outras etapas que o operador nunca tratou', async () => {
    expect(errorCode(await services.parts.getDetails(OP.rafael, PART.docaLeve.id))).toBe('ACESSO_NEGADO');
    // part-008 passou por Fernanda (Doca) e Juliana (Meio); Carlos nunca a tratou
    expect(errorCode(await services.parts.getDetails(OP.carlos, PART.destruicaoUrgente.id))).toBe('ACESSO_NEGADO');
  });

  it('libera a fila da própria etapa e as peças que ele já tratou (mesmo em outra etapa agora)', async () => {
    expect(unwrap(await services.parts.getDetails(OP.rafael, PART.meioLeve.id)).part.number).toBe(
      PART.meioLeve.number,
    );
    // Carlos validou part-005 na Doca; hoje ela está no Meio
    expect(unwrap(await services.parts.getDetails(OP.carlos, PART.meioLeve.id)).part.currentStage).toBe('meio');
    // Fernanda validou part-008, não part-007 (que foi do Carlos)
    expect(errorCode(await services.parts.getDetails(OP.fernanda, PART.destruicaoMedio.id))).toBe('ACESSO_NEGADO');
  });

  it('linha do tempo distingue etapas aprovadas, pendente e futuras; lista os operadores envolvidos', async () => {
    const details = unwrap(await services.parts.getDetails(OP.marcos, PART.destruicaoMedio.id));
    expect(details.timeline.map((s) => s.state)).toEqual(['aprovada', 'aprovada', 'pendente']);
    expect(details.operators.map((o) => o.name).sort()).toEqual(['Carlos Almeida', 'Rafael Souza']);
    expect(details.events.map((e) => e.stage)).toEqual(['doca', 'meio']);

    const revisao = unwrap(await services.parts.getDetails(OP.rafael, PART.meioEmRevisao.id));
    expect(revisao.timeline.map((s) => s.state)).toEqual(['aprovada', 'em_revisao', 'futura']);
    expect(revisao.reviews).toHaveLength(1);

    const docaPending = unwrap(await services.parts.getDetails(OP.carlos, PART.docaLeve.id));
    expect(docaPending.timeline.map((s) => s.state)).toEqual(['pendente', 'futura', 'futura']);
  });

  it('peça concluída mostra o dossiê nos detalhes', async () => {
    const details = unwrap(await services.parts.getDetails(OP.carlos, PART.concluida.id));
    expect(details.timeline.map((s) => s.state)).toEqual(['aprovada', 'aprovada', 'aprovada']);
    expect(details.dossier?.partNumber).toBe(PART.concluida.number);
  });
});

describe('consulta por número (scanner)', () => {
  const { services } = createHarness();

  it('encontra peça elegível', async () => {
    const found = unwrap(await services.parts.lookupForValidation(OP.carlos, PART.docaLeve.number));
    expect(found.part.id).toBe(PART.docaLeve.id);
    expect(found.band).toBe('leve');
  });

  it('trata número inválido, inexistente, de outra etapa, em revisão e concluída', async () => {
    const look = (op: string, n: string) => services.parts.lookupForValidation(op, n);
    expect(errorCode(await look(OP.carlos, '12ab'))).toBe('IDENTIFICADOR_INVALIDO');
    expect(errorCode(await look(OP.carlos, ''))).toBe('IDENTIFICADOR_INVALIDO');
    expect(errorCode(await look(OP.carlos, '00000000'))).toBe('PECA_NAO_ENCONTRADA');
    expect(errorCode(await look(OP.carlos, PART.meioLeve.number))).toBe('ETAPA_INCOMPATIVEL');
    expect(errorCode(await look(OP.rafael, PART.meioEmRevisao.number))).toBe('PECA_EM_REVISAO');
    expect(errorCode(await look(OP.marcos, PART.concluida.number))).toBe('PECA_CONCLUIDA');
  });

  it('a mensagem de etapa incompatível não revela onde a peça está', async () => {
    const result = await services.parts.lookupForValidation(OP.carlos, PART.destruicaoMedio.number);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).not.toMatch(/Destruição/);
      expect(result.error.message).toMatch(/Doca/);
    }
  });
});

describe('Cenário A: fluxo normal completo', () => {
  it('doca → meio → destruição → conclusão com eventos, notificações e dossiê', async () => {
    const h = createHarness();
    const { services } = h;
    const part = PART.docaLeve;

    // 1) Doca
    const first = unwrap(await services.validation.validate(OP.carlos, part.id));
    expect(first.nextStage).toBe('meio');
    expect(first.completed).toBe(false);
    expect(first.part.currentStage).toBe('meio');
    expect(first.part.status).toBe('em_andamento');
    expect(first.event).toMatchObject({
      operatorName: 'Carlos Almeida',
      operatorRegistration: '483917',
      stage: 'doca',
      type: 'validacao',
      result: 'aprovada',
    });
    // notifica operadores ativos do Meio (o inativo não recebe)
    expect(first.notifications.map((n) => n.recipientOperatorId).sort()).toEqual([OP.rafael, OP.juliana]);
    expect(first.notifications.every((n) => !n.read && n.partNumber === part.number)).toBe(true);

    // sai da fila da Doca e entra na do Meio
    expect(unwrap(await services.parts.listQueue(OP.carlos)).some((i) => i.part.id === part.id)).toBe(false);
    expect(unwrap(await services.parts.listQueue(OP.juliana)).some((i) => i.part.id === part.id)).toBe(true);

    // 2) Meio
    h.advanceMinutes(30);
    const second = unwrap(await services.validation.validate(OP.juliana, part.id));
    expect(second.nextStage).toBe('destruicao');
    expect(second.notifications.map((n) => n.recipientOperatorId).sort()).toEqual([OP.marcos, OP.patricia]);

    // 3) Destruição = conclusão
    h.advanceMinutes(45);
    const last = unwrap(await services.validation.validate(OP.patricia, part.id));
    expect(last.completed).toBe(true);
    expect(last.nextStage).toBeNull();
    expect(last.event).toMatchObject({ type: 'conclusao', result: 'concluida', stage: 'destruicao' });
    expect(last.part).toMatchObject({ status: 'concluida', stageStatus: 'aprovada_na_etapa' });
    expect(last.part.completedAt).toBe(last.event.timestamp);
    expect(last.dossierId).toBe(`dossier-${part.id}`);

    // dossiê com a trilha completa
    const dossier = unwrap(await services.dossiers.getByPart(OP.carlos, part.id));
    expect(dossier.partNumber).toBe(part.number);
    expect(dossier.dock).toBe('A');
    expect(dossier.stages.map((s) => [s.stage, s.operatorName, s.operatorRegistration])).toEqual([
      ['doca', 'Carlos Almeida', '483917'],
      ['meio', 'Juliana Costa', '702418'],
      ['destruicao', 'Patrícia Rocha', '941762'],
    ]);
    expect(dossier.completedAt).toBe(last.event.timestamp);

    // peça concluída não pode ser validada de novo por ninguém
    expect(errorCode(await services.validation.validate(OP.patricia, part.id))).toBe('PECA_CONCLUIDA');
    expect(errorCode(await services.validation.validate(OP.carlos, part.id))).toBe('ETAPA_INCOMPATIVEL');

    // auditoria: exatamente 3 eventos novos da peça, em ordem
    const trail = unwrap(await services.events.listByPart(OP.carlos, part.id));
    expect(trail.map((e) => e.stage)).toEqual(['doca', 'meio', 'destruicao']);
  });
});

describe('regras de validação (bloqueios)', () => {
  it('não pula etapas: operador de outra etapa não valida e nada é gravado', async () => {
    const h = createHarness();
    const before = await h.snapshot();
    expect(errorCode(await h.services.validation.validate(OP.rafael, PART.docaLeve.id))).toBe('ETAPA_INCOMPATIVEL');
    expect(errorCode(await h.services.validation.validate(OP.marcos, PART.docaLeve.id))).toBe('ETAPA_INCOMPATIVEL');
    expect(errorCode(await h.services.validation.validate(OP.carlos, PART.meioLeve.id))).toBe('ETAPA_INCOMPATIVEL');
    expect(await h.snapshot()).toEqual(before);
  });

  it('bloqueia peça inexistente, operador inativo/desconhecido e peça em revisão', async () => {
    const h = createHarness();
    expect(errorCode(await h.services.validation.validate(OP.carlos, 'part-999'))).toBe('PECA_NAO_ENCONTRADA');
    expect(errorCode(await h.services.validation.validate(OP.ricardo, PART.meioLeve.id))).toBe('OPERADOR_INATIVO');
    expect(errorCode(await h.services.validation.validate('op-999', PART.docaLeve.id))).toBe('OPERADOR_NAO_ENCONTRADO');
    expect(errorCode(await h.services.validation.validate(OP.rafael, PART.meioEmRevisao.id))).toBe('PECA_EM_REVISAO');
  });

  it('o mesmo toque duplicado não registra a validação duas vezes', async () => {
    const h = createHarness();
    const results = await Promise.all([
      h.services.validation.validate(OP.carlos, PART.docaLeve.id),
      h.services.validation.validate(OP.carlos, PART.docaLeve.id),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map(errorCode)).toEqual(['ETAPA_INCOMPATIVEL']);
    const trail = unwrap(await h.services.events.listByPart(OP.carlos, PART.docaLeve.id));
    expect(trail).toHaveLength(1);
  });

  it('dois operadores da mesma etapa disputando a mesma peça: só um registra', async () => {
    const h = createHarness();
    const results = await Promise.all([
      h.services.validation.validate(OP.carlos, PART.docaMedio.id),
      h.services.validation.validate(OP.fernanda, PART.docaMedio.id),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const events = (await h.snapshot()).events.filter((e) => e.partId === PART.docaMedio.id);
    expect(events).toHaveLength(1);
  });

  it('peça com prazo vencido continua na etapa e pode ser validada normalmente', async () => {
    const h = createHarness();
    const before = unwrap(await h.services.parts.getDetails(OP.carlos, PART.docaVencida.id));
    expect(before.band).toBe('vencido');
    expect(before.daysRemaining).toBeLessThan(0);
    expect(before.part).toMatchObject({ currentStage: 'doca', status: 'em_andamento' });

    const outcome = unwrap(await h.services.validation.validate(OP.carlos, PART.docaVencida.id));
    expect(outcome.nextStage).toBe('meio');
  });
});

describe('Cenário D: prazo é derivado da data, não armazenado', () => {
  it('a faixa muda conforme o tempo passa, sem alterar etapa nem status', async () => {
    const h = createHarness();
    const bandOf = async () =>
      unwrap(await h.services.parts.getDetails(OP.carlos, PART.docaLeve.id)).band;
    expect(await bandOf()).toBe('leve');

    h.advanceMinutes(60 * 24 * 130); // ~130 dias depois: restam ~50 dias
    expect(await bandOf()).toBe('medio');
    h.advanceMinutes(60 * 24 * 30);
    expect(await bandOf()).toBe('urgente');
    h.advanceMinutes(60 * 24 * 40);
    const late = unwrap(await h.services.parts.getDetails(OP.carlos, PART.docaLeve.id));
    expect(late.band).toBe('vencido');
    expect(late.part).toMatchObject({ currentStage: 'doca', status: 'em_andamento' });
  });
});

describe('Cenário B: revisão', () => {
  it('envia para revisão, bloqueia o avanço e registra evento e notificação', async () => {
    const h = createHarness();
    const { services } = h;
    const unreadBefore = unwrap(await services.notifications.countUnread(OP.fernanda));

    const outcome = unwrap(
      await services.reviews.requestReview(OP.fernanda, PART.docaMedio.id, {
        reason: 'peca_quebrada',
        justification: '  Peça chegou com a carcaça trincada.  ',
      }),
    );
    expect(outcome.review).toMatchObject({
      status: 'em_analise',
      stage: 'doca',
      reason: 'peca_quebrada',
      requestedByOperatorName: 'Fernanda Lima',
      justification: 'Peça chegou com a carcaça trincada.',
      decision: null,
    });
    expect(outcome.part).toMatchObject({ status: 'em_revisao', stageStatus: 'em_revisao', currentStage: 'doca' });
    expect(outcome.event).toMatchObject({
      type: 'revisao_solicitada',
      result: 'enviada_para_revisao',
      note: 'Peça chegou com a carcaça trincada.',
    });

    // bloqueado: não avança, não entra mais na fila, não aceita outro pedido
    expect(errorCode(await services.validation.validate(OP.carlos, PART.docaMedio.id))).toBe('PECA_EM_REVISAO');
    expect(errorCode(await services.validation.validate(OP.fernanda, PART.docaMedio.id))).toBe('PECA_EM_REVISAO');
    expect(
      errorCode(
        await services.reviews.requestReview(OP.carlos, PART.docaMedio.id, { reason: 'outro', justification: 'x' }),
      ),
    ).toBe('PECA_EM_REVISAO');
    const queue = unwrap(await services.parts.listQueue(OP.carlos));
    expect(queue.some((i) => i.part.id === PART.docaMedio.id)).toBe(false);

    // notificação ao solicitante
    expect(unwrap(await services.notifications.countUnread(OP.fernanda))).toBe(unreadBefore + 1);

    // peça entra no histórico de quem pediu a revisão
    const history = unwrap(await services.events.listByOperator(OP.fernanda));
    expect(history[0]).toMatchObject({ type: 'revisao_solicitada', partNumber: PART.docaMedio.number });
  });

  it('exige motivo válido e justificativa, e respeita a etapa do operador; nada é gravado nas falhas', async () => {
    const h = createHarness();
    const before = await h.snapshot();
    const request = h.services.reviews.requestReview;

    expect(errorCode(await request(OP.carlos, PART.docaLeve.id, { reason: 'outro', justification: '   ' }))).toBe(
      'JUSTIFICATIVA_OBRIGATORIA',
    );
    expect(
      errorCode(
        await request(OP.carlos, PART.docaLeve.id, {
          reason: 'invalido' as unknown as 'outro',
          justification: 'algo',
        }),
      ),
    ).toBe('MOTIVO_INVALIDO');
    expect(errorCode(await request(OP.rafael, PART.docaLeve.id, { reason: 'outro', justification: 'algo' }))).toBe(
      'ETAPA_INCOMPATIVEL',
    );
    expect(errorCode(await request(OP.carlos, 'part-999', { reason: 'outro', justification: 'algo' }))).toBe(
      'PECA_NAO_ENCONTRADA',
    );
    expect(await h.snapshot()).toEqual(before);
  });

  it('aceita os três motivos (descartada, quebrada, outro)', async () => {
    const h = createHarness();
    const reasons = ['peca_descartada', 'peca_quebrada', 'outro'] as const;
    const parts = [PART.docaLeve.id, PART.docaMedio.id, PART.docaUrgente.id];
    for (const [i, reason] of reasons.entries()) {
      const outcome = unwrap(
        await h.services.reviews.requestReview(OP.carlos, parts[i]!, { reason, justification: `motivo ${i}` }),
      );
      expect(outcome.review.reason).toBe(reason);
    }
  });
});

describe('Cenário C: histórico', () => {
  it('deriva dos eventos do operador, preserva os anteriores e registra os dados no momento do evento', async () => {
    const h = createHarness();
    const { services } = h;
    const before = unwrap(await services.events.listByOperator(OP.carlos));
    expect(before.every((e) => e.operatorId === OP.carlos)).toBe(true);

    h.advanceMinutes(10);
    const outcome = unwrap(await services.validation.validate(OP.carlos, PART.docaLeve.id));
    const after = unwrap(await services.events.listByOperator(OP.carlos));

    expect(after).toHaveLength(before.length + 1);
    expect(after[0]).toEqual(outcome.event); // mais recente primeiro
    expect(after.slice(1)).toEqual(before); // eventos anteriores preservados
    expect(after[0]).toMatchObject({
      operatorName: 'Carlos Almeida',
      operatorRegistration: '483917',
      stage: 'doca',
      partNumber: PART.docaLeve.number,
    });
    expect(new Date(after[0]!.timestamp).toISOString()).toBe(after[0]!.timestamp);

    // detalhes da peça mostram a trilha anterior e a nova
    const details = unwrap(await services.parts.getDetails(OP.carlos, PART.docaLeve.id));
    expect(details.events).toHaveLength(1);
  });

  it('o histórico de um operador não inclui eventos de outros', async () => {
    const { services } = createHarness();
    const fernanda = unwrap(await services.events.listByOperator(OP.fernanda));
    expect(fernanda.length).toBeGreaterThan(0);
    expect(fernanda.every((e) => e.operatorId === OP.fernanda)).toBe(true);
  });
});

describe('notificações', () => {
  it('listam em ordem decrescente, contam não lidas e marcam como lidas sem recriar', async () => {
    const { services } = createHarness();
    const list = unwrap(await services.notifications.listForOperator(OP.rafael));
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    expect(list.map((n) => n.id)).toEqual(sorted.map((n) => n.id));
    expect(list.every((n) => n.recipientOperatorId === OP.rafael)).toBe(true);

    const unread = unwrap(await services.notifications.countUnread(OP.rafael));
    expect(unread).toBeGreaterThan(0);

    const target = list.find((n) => !n.read)!;
    const read = unwrap(await services.notifications.markAsRead(OP.rafael, target.id));
    expect(read.read).toBe(true);
    expect(unwrap(await services.notifications.countUnread(OP.rafael))).toBe(unread - 1);

    // idempotente e sem criar notificações novas ao reler
    unwrap(await services.notifications.markAsRead(OP.rafael, target.id));
    expect(unwrap(await services.notifications.countUnread(OP.rafael))).toBe(unread - 1);
    expect(unwrap(await services.notifications.listForOperator(OP.rafael))).toHaveLength(list.length);
  });

  it('só o destinatário acessa e marca a notificação', async () => {
    const { services } = createHarness();
    const mine = unwrap(await services.notifications.listForOperator(OP.rafael))[0]!;
    expect(errorCode(await services.notifications.getById(OP.marcos, mine.id))).toBe('NOTIFICACAO_NAO_ENCONTRADA');
    expect(errorCode(await services.notifications.markAsRead(OP.marcos, mine.id))).toBe('NOTIFICACAO_NAO_ENCONTRADA');
    expect(unwrap(await services.notifications.getById(OP.rafael, mine.id)).id).toBe(mine.id);
  });

  it('markAllAsRead zera as não lidas e informa quantas mudaram', async () => {
    const { services } = createHarness();
    const unread = unwrap(await services.notifications.countUnread(OP.marcos));
    expect(unwrap(await services.notifications.markAllAsRead(OP.marcos))).toBe(unread);
    expect(unwrap(await services.notifications.countUnread(OP.marcos))).toBe(0);
    expect(unwrap(await services.notifications.markAllAsRead(OP.marcos))).toBe(0);
  });
});

describe('dossiês', () => {
  it('geração é idempotente: não duplica para a mesma conclusão', async () => {
    const h = createHarness();
    const { services } = h;
    const before = (await h.snapshot()).dossiers.length;

    // peça já concluída no seed
    const again = unwrap(await services.dossiers.generateForPart(PART.concluida.id));
    expect(again.created).toBe(false);
    expect((await h.snapshot()).dossiers).toHaveLength(before);

    // peça concluída agora: validar cria; gerar de novo reaproveita
    unwrap(await services.validation.validate(OP.carlos, PART.docaLeve.id));
    unwrap(await services.validation.validate(OP.rafael, PART.docaLeve.id));
    const done = unwrap(await services.validation.validate(OP.marcos, PART.docaLeve.id));
    expect((await h.snapshot()).dossiers).toHaveLength(before + 1);

    const repeated = unwrap(await services.dossiers.generateForPart(PART.docaLeve.id));
    expect(repeated.created).toBe(false);
    expect(repeated.dossier.id).toBe(done.dossierId);
    expect((await h.snapshot()).dossiers).toHaveLength(before + 1);
  });

  it('não gera dossiê de peça não concluída e restringe a consulta', async () => {
    const { services } = createHarness();
    expect(errorCode(await services.dossiers.generateForPart(PART.docaLeve.id))).toBe('PECA_NAO_CONCLUIDA');
    expect(errorCode(await services.dossiers.generateForPart('part-999'))).toBe('PECA_NAO_ENCONTRADA');
    expect(errorCode(await services.dossiers.getByPart(OP.carlos, PART.docaLeve.id))).toBe('PECA_NAO_CONCLUIDA');
    // Fernanda atuou na Doca da peça concluída part-013, não da part-012
    expect(errorCode(await services.dossiers.getByPart(OP.fernanda, PART.concluida.id))).toBe('ACESSO_NEGADO');
    expect(unwrap(await services.dossiers.getByPart(OP.carlos, PART.concluida.id)).stages).toHaveLength(3);
  });
});

describe('Cenário F: persistência', () => {
  it('estado alterado sobrevive a reiniciar o app (novo repositório, mesmo armazenamento)', async () => {
    const storage = createMemoryStorage();
    const first = createHarness({ storage });
    unwrap(await first.services.validation.validate(OP.carlos, PART.docaLeve.id));
    unwrap(
      await first.services.reviews.requestReview(OP.fernanda, PART.docaMedio.id, {
        reason: 'outro',
        justification: 'Teste de persistência',
      }),
    );

    // "reinicia": novo repositório e serviços lendo o mesmo armazenamento
    const second = createHarness({ storage });
    const details = unwrap(await second.services.parts.getDetails(OP.carlos, PART.docaLeve.id));
    expect(details.part.currentStage).toBe('meio');
    expect(details.events).toHaveLength(1);
    const history = unwrap(await second.services.events.listByOperator(OP.carlos));
    expect(history[0]!.partNumber).toBe(PART.docaLeve.number);
    expect(unwrap(await second.services.parts.getDetails(OP.fernanda, PART.docaMedio.id)).part.status).toBe(
      'em_revisao',
    );
    // não regenera os dados iniciais por cima
    expect((await second.snapshot()).events).toEqual((await first.snapshot()).events);
  });

  it('dados corrompidos no armazenamento voltam aos dados iniciais', async () => {
    const storage = createMemoryStorage({ 'renault-tracer/database': '{não é json' });
    const h = createHarness({ storage });
    expect(unwrap(await h.services.parts.listQueue(OP.carlos))).toHaveLength(5);
  });

  it('falha ao gravar faz rollback: nada muda e o erro é informado', async () => {
    const flaky = createFlakyStorage(createMemoryStorage());
    const h = createHarness({ storage: flaky.storage });
    const before = await h.snapshot(); // carrega e grava o seed

    flaky.state.failWrites = true;
    const result = await h.services.validation.validate(OP.carlos, PART.docaLeve.id);
    expect(errorCode(result)).toBe('ERRO_ARMAZENAMENTO');
    expect(await h.snapshot()).toEqual(before);

    flaky.state.failWrites = false;
    expect(unwrap(await h.services.validation.validate(OP.carlos, PART.docaLeve.id)).nextStage).toBe('meio');
  });

  it('resetData volta aos dados iniciais', async () => {
    const h = createHarness();
    const initial = await h.snapshot();
    unwrap(await h.services.validation.validate(OP.carlos, PART.docaLeve.id));
    expect(await h.snapshot()).not.toEqual(initial);
    await h.services.resetData();
    expect(await h.snapshot()).toEqual(initial);
  });

  it('objetos devolvidos são cópias: alterá-los não afeta o estado', async () => {
    const { services } = createHarness();
    const queue = unwrap(await services.parts.listQueue(OP.carlos));
    queue[0]!.part.status = 'concluida';
    queue.pop();
    const fresh = unwrap(await services.parts.listQueue(OP.carlos));
    expect(fresh).toHaveLength(5);
    expect(fresh[0]!.part.status).toBe('em_andamento');
  });
});

describe('repositório', () => {
  it('na primeira execução monta o seed e já o persiste', async () => {
    const storage = createMemoryStorage();
    const repo = new Repository(storage, buildSeedDatabase, { now: () => new Date('2026-10-14T12:00:00-03:00') });
    createServices(repo);
    expect(await storage.getItem('renault-tracer/database')).toBeNull();
    await repo.read((db) => db.parts.length);
    expect(await storage.getItem('renault-tracer/database')).not.toBeNull();
  });
});
