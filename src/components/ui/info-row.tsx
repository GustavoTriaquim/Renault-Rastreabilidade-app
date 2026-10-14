import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

interface InfoRowProps {
  label: string;
  value?: string;
  children?: ReactNode;
}

/** Par rótulo/valor para telas de detalhes. */
export function InfoRow({ label, value, children }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={theme.colors.textSecondary}>
        {label}
      </AppText>
      {children ?? <AppText variant="bodyStrong">{value ?? '—'}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: theme.spacing.xxs },
});
