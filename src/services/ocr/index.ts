import { PART_NUMBER_DIGITS, REGISTRATION_DIGITS } from '@/constants/ocr';

import { readNumbers, type OcrReadResult } from './recognize';
import { textExtractorEngine } from './text-extractor-engine';

export type { CandidateKind, OcrCandidate } from './candidates';
export type { OcrEngine, OcrReadResult } from './recognize';

/** Lê a matrícula impressa no crachá a partir de uma foto. */
export function readBadgeNumber(imageUri: string): Promise<OcrReadResult> {
  return readNumbers(textExtractorEngine, imageUri, REGISTRATION_DIGITS);
}

/** Lê o número impresso em uma peça (ou etiqueta) a partir de uma foto. */
export function readPartNumber(imageUri: string): Promise<OcrReadResult> {
  return readNumbers(textExtractorEngine, imageUri, PART_NUMBER_DIGITS);
}
