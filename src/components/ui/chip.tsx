import { Pressable, StyleSheet } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** Opção de filtro selecionável, com área de toque confortável. */
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}>
      <AppText
        variant="bodyStrong"
        color={selected ? theme.colors.accent : theme.colors.text}
        numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
});
