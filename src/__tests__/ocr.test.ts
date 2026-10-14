import { extractNumericCandidates } from '@/services/ocr/candidates';
import { readNumbers, type OcrEngine } from '@/services/ocr/recognize';

const REGISTRATION = { minDigits: 4, maxDigits: 12 };

function values(lines: string[], options = REGISTRATION) {
  return extractNumericCandidates(lines, options).candidates.map((c) => c.value);
}

describe('extractNumericCandidates', () => {
  it('lê um número limpo', () => {
    const { candidates } = extractNumericCandidates(['483917'], REGISTRATION);
    expect(candidates).toEqual([{ value: '483917', kind: 'exact', raw: '483917' }]);
  });

  it('ignora pontuação nas pontas', () => {
    expect(values(['Matrícula: 483917,', '(574206)'])).toEqual(['483917', '574206']);
  });

  it('devolve vários números sem escolher um deles', () => {
    expect(values(['RENAULT', '483917', 'Turno 2', '619853'])).toEqual(['483917', '619853']);
  });

  it('não vira candidato: datas, horários e telefones com separadores', () => {
    expect(values(['14/10/2026', '12:30:45', '(41) 99999-1234', '2026-10-14'])).toEqual([]);
  });

  it('une blocos vizinhos e mantém os blocos longos o bastante', () => {
    const { candidates } = extractNumericCandidates(['483 917'], REGISTRATION);
    expect(candidates).toEqual([{ value: '483917', kind: 'joined', raw: '483 917' }]);
    expect(values(['5831 6072'], { minDigits: 8, maxDigits: 8 })).toEqual(['58316072']);
  });

  it('corrige letras confundíveis e marca o candidato como corrigido', () => {
    const { candidates } = extractNumericCandidates(['4B3917', 'O12345'], REGISTRATION);
    expect(candidates).toEqual([
      { value: '483917', kind: 'corrected', raw: '4B3917' },
      { value: '012345', kind: 'corrected', raw: 'O12345' },
    ]);
  });

  it('não transforma palavras em números', () => {
    expect(values(['ISSO', 'SOLO', 'BOSS', 'Z0NA'])).toEqual([]);
  });

  it('ordena por confiança: exato, corrigido, unido', () => {
    const { candidates } = extractNumericCandidates(['4B3917', '123 456', '702418'], REGISTRATION);
    expect(candidates.map((c) => c.kind)).toEqual(['exact', 'corrected', 'joined']);
  });

  it('remove duplicatas mantendo a forma mais confiável', () => {
    const { candidates } = extractNumericCandidates(['483917', '483 917'], REGISTRATION);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].kind).toBe('exact');
  });

  it('registra números curtos e longos demais como descartados', () => {
    const { candidates, ignored } = extractNumericCandidates(['123', '1234567890123'], REGISTRATION);
    expect(candidates).toEqual([]);
    expect(ignored).toEqual([
      { text: '123', reason: 'curto' },
      { text: '1234567890123', reason: 'longo' },
    ]);
  });
});

function fakeEngine(overrides: Partial<OcrEngine> & { lines?: string[] } = {}): OcrEngine {
  return {
    isAvailable: overrides.isAvailable ?? (async () => true),
    recognizeLines: overrides.recognizeLines ?? (async () => overrides.lines ?? []),
  };
}

describe('readNumbers', () => {
  it('classifica a leitura correta', async () => {
    const result = await readNumbers(fakeEngine({ lines: ['483917'] }), 'file://a.jpg', REGISTRATION);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.candidates.map((c) => c.value)).toEqual(['483917']);
  });

  it('classifica nenhum texto detectado', async () => {
    const result = await readNumbers(fakeEngine({ lines: ['  ', ''] }), 'file://a.jpg', REGISTRATION);
    expect(result.status).toBe('no_text');
  });

  it('classifica texto sem números', async () => {
    const result = await readNumbers(fakeEngine({ lines: ['RENAULT', 'Operador'] }), 'x', REGISTRATION);
    expect(result.status).toBe('no_numbers');
  });

  it('classifica leitura parcial', async () => {
    const result = await readNumbers(fakeEngine({ lines: ['Mat 483'] }), 'x', REGISTRATION);
    expect(result).toEqual({ status: 'partial', fragments: ['483'], lines: ['Mat 483'] });
  });

  it('classifica motor indisponível sem tentar ler', async () => {
    let called = false;
    const engine = fakeEngine({
      isAvailable: async () => false,
      recognizeLines: async () => {
        called = true;
        return [];
      },
    });
    expect((await readNumbers(engine, 'x', REGISTRATION)).status).toBe('unavailable');
    expect(called).toBe(false);
  });

  it('transforma exceções do motor em erro tratado', async () => {
    const engine = fakeEngine({
      recognizeLines: async () => {
        throw new Error('arquivo ilegível');
      },
    });
    const result = await readNumbers(engine, 'x', REGISTRATION);
    expect(result.status).toBe('error');
  });
});
