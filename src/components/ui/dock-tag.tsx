import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';
import type { DockId } from '@/types/domain';

import { AppText } from './app-text';

interface DockTagProps {
  dock: DockId;
}

/** Etiqueta da doca de chegada (A vermelho, B azul, C verde). Independe do alerta de prazo. */
export function DockTag({ dock }: DockTagProps) {
  const { background, foreground } = theme.dockColors[dock];

  return (
    <View
      accessible
      accessibilityLabel={`Doca ${dock}`}
      style={[styles.tag, { backgroundColor: background }]}>
      <AppText variant="label" color={foreground}>
        DOCA {dock}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
  },
});
