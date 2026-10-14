/**
 * Extração de candidatos numéricos a partir do texto devolvido pelo OCR.
 *
 * Função pura, sem dependência de câmera ou de biblioteca nativa: o motor de OCR
 * só entrega linhas de texto e este módulo decide o que parece um identificador.
 * Quem consulta os dados e decide se a operação é válida é a camada de serviços.
 */

/** Natureza do candidato, do mais confiável para o menos confiável. */
export type CandidateKind = 'exact' | 'corrected' | 'joined';

export interface OcrCandidate {
  /** Somente dígitos, pronto para consultar nos serviços. */
  value: string;
  kind: CandidateKind;
  /** Trecho original lido pelo OCR, para o operador conferir. */
  raw: string;
}

export interface CandidateOptions {
  minDigits: number;
  maxDigits: number;
}

export interface IgnoredFragment {
  text: string;
  reason: 'curto' | 'longo';
}

export interface CandidateExtraction {
  candidates: OcrCandidate[];
  /** Sequências numéricas descartadas por tamanho (leitura parcial ou número longo demais). */
  ignored: IgnoredFragment[];
}

/** Letras que o OCR costuma confundir com dígitos. */
const CONFUSABLE: Readonly<Record<string, string>> = {
  O: '0',
  o: '0',
  I: '1',
  l: '1',
  '|': '1',
  Z: '2',
  z: '2',
  S: '5',
  s: '5',
  B: '8',
};

const KIND_PRIORITY: Record<CandidateKind, number> = { exact: 0, corrected: 1, joined: 2 };

/** Remove pontuação nas pontas do trecho (ex.: "483917," ou "(483917)"). */
function trimEdges(token: string): string {
  return token.replace(/^[^\dA-Za-z|]+|[^\dA-Za-z|]+$/g, '');
}

function isDigitsOnly(token: string): boolean {
  return /^\d+$/.test(token);
}

/** Aceita dígitos misturados a letras confundíveis, desde que dígitos sejam ao menos metade. */
function toCorrectedDigits(token: string): string | null {
  if (!/^[\dOoIl|SsBZz]+$/.test(token)) return null;
  const realDigits = token.replace(/\D/g, '').length;
  if (realDigits * 2 < token.length) return null;
  return token.replace(/[OoIl|SsBZz]/g, (char) => CONFUSABLE[char] ?? char);
}

/**
 * Procura números no texto reconhecido.
 *
 * - Só considera trechos inteiros formados por dígitos (ou por dígitos com letras
 *   confundíveis, como O/0 e I/1). Datas, horários e telefones com separadores
 *   (`14/10/2026`, `12:30`) não viram candidatos.
 * - Blocos de dígitos vizinhos na mesma linha (`483 917`) geram também o número unido.
 * - Nunca escolhe por conta própria: devolve todos os candidatos, em ordem de confiança.
 */
export function extractNumericCandidates(
  lines: readonly string[],
  { minDigits, maxDigits }: CandidateOptions,
): CandidateExtraction {
  const found = new Map<string, OcrCandidate>();
  const ignored: IgnoredFragment[] = [];

  const add = (candidate: OcrCandidate) => {
    const existing = found.get(candidate.value);
    if (!existing || KIND_PRIORITY[candidate.kind] < KIND_PRIORITY[existing.kind]) {
      found.set(candidate.value, candidate);
    }
  };

  const inRange = (digits: string) => digits.length >= minDigits && digits.length <= maxDigits;

  for (const line of lines) {
    const tokens = line.split(/\s+/).map(trimEdges).filter((token) => token.length > 0);
    let run: string[] = [];

    const flushRun = () => {
      if (run.length >= 2) {
        const joined = run.join('');
        if (inRange(joined)) add({ value: joined, kind: 'joined', raw: run.join(' ') });
      }
      run = [];
    };

    for (const token of tokens) {
      if (isDigitsOnly(token)) {
        run.push(token);
        if (inRange(token)) {
          add({ value: token, kind: 'exact', raw: token });
        } else {
          ignored.push({ text: token, reason: token.length < minDigits ? 'curto' : 'longo' });
        }
        continue;
      }

      flushRun();
      const corrected = toCorrectedDigits(token);
      if (corrected !== null) {
        if (inRange(corrected)) {
          add({ value: corrected, kind: 'corrected', raw: token });
        } else {
          ignored.push({ text: token, reason: corrected.length < minDigits ? 'curto' : 'longo' });
        }
      }
    }
    flushRun();
  }

  const candidates = [...found.values()]
    .map((candidate, order) => ({ candidate, order }))
    .sort(
      (a, b) =>
        KIND_PRIORITY[a.candidate.kind] - KIND_PRIORITY[b.candidate.kind] || a.order - b.order,
    )
    .map(({ candidate }) => candidate);

  return { candidates, ignored };
}
