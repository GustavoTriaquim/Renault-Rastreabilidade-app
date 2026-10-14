import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

/** Título de tela com subtítulo opcional. */
export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <AppText variant="display" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? <AppText color={theme.colors.textSecondary}>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.xs },
});
