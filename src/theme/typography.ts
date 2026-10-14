import type { TextStyle } from 'react-native';

/** Escala tipográfica. Fonte do sistema (sem serifa); títulos com peso forte. */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.4 },
  /** Números de peça e matrículas: dígitos de largura fixa facilitam a leitura. */
  identifier: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
