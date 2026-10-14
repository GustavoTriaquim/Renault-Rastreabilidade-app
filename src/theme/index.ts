import { colors, deadlineColors, dockColors, overlay, toneColors } from './colors';
import { radii, spacing, touch } from './spacing';
import { typography } from './typography';

export type { Tone } from './colors';
export type { TypographyVariant } from './typography';

/** Design system do app: importe sempre `theme` em vez de valores soltos. */
export const theme = {
  colors,
  toneColors,
  dockColors,
  deadlineColors,
  overlay,
  typography,
  spacing,
  radii,
  touch,
} as const;
