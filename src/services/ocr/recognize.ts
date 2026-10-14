import {
  extractNumericCandidates,
  type CandidateOptions,
  type OcrCandidate,
} from './candidates';

/**
 * Motor de OCR: devolve as linhas de texto de uma imagem. É a única peça que
 * conhece a biblioteca nativa, então pode ser trocada sem mexer em telas ou regras.
 */
export interface OcrEngine {
  isAvailable(): Promise<boolean>;
  recognizeLines(imageUri: string): Promise<string[]>;
}

/** Resultado de uma leitura, já classificado para a interface decidir o que mostrar. */
export type OcrReadResult =
  /** Um ou mais candidatos. Com vários, o operador escolhe; nada é selecionado sozinho. */
  | { status: 'ok'; candidates: OcrCandidate[]; lines: string[] }
  /** O OCR não encontrou nenhum texto na imagem. */
  | { status: 'no_text' }
  /** Havia texto, mas nenhum número no formato esperado. */
  | { status: 'no_numbers'; lines: string[] }
  /** Só foram lidos números curtos demais (leitura incompleta). */
  | { status: 'partial'; fragments: string[]; lines: string[] }
  /** Motor de OCR indisponível (ex.: app sem o módulo nativo). */
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export async function readNumbers(
  engine: OcrEngine,
  imageUri: string,
  options: CandidateOptions,
): Promise<OcrReadResult> {
  let lines: string[];
  try {
    if (!(await engine.isAvailable())) return { status: 'unavailable' };
    lines = (await engine.recognizeLines(imageUri)).map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: 'error', message: `Falha ao reconhecer o texto da imagem. ${detail}`.trim() };
  }

  if (lines.length === 0) return { status: 'no_text' };

  const { candidates, ignored } = extractNumericCandidates(lines, options);
  if (candidates.length > 0) return { status: 'ok', candidates, lines };

  const fragments = ignored.filter((item) => item.reason === 'curto').map((item) => item.text);
  if (fragments.length > 0) return { status: 'partial', fragments, lines };

  return { status: 'no_numbers', lines };
}
