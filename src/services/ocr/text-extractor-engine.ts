import type { OcrEngine } from './recognize';

type TextExtractorModule = typeof import('expo-text-extractor');

/**
 * Carrega o módulo nativo só quando preciso. Se o app estiver sem ele (por exemplo,
 * rodando no Expo Go), a falha vira "OCR indisponível" em vez de derrubar o app.
 */
async function loadModule(): Promise<TextExtractorModule | null> {
  try {
    return await import('expo-text-extractor');
  } catch {
    return null;
  }
}

/** OCR real no aparelho (ML Kit no Android, Vision no iOS), sem internet. */
export const textExtractorEngine: OcrEngine = {
  async isAvailable() {
    const module = await loadModule();
    return module !== null && module.isSupported;
  },
  async recognizeLines(imageUri) {
    const module = await loadModule();
    if (!module) throw new Error('Módulo de OCR indisponível.');
    return module.extractTextFromImage(imageUri);
  },
};
