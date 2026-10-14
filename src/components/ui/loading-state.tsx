import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

/** Indicador de carregamento centralizado. */
export function LoadingState({ message = 'Carregando…' }: { message?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <AppText color={theme.colors.textSecondary}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
});
