import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { theme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Conteúdo rolável (padrão). Use `false` para telas com layout fixo. */
  scroll?: boolean;
  /** Bordas protegidas por safe area. Telas dentro de abas não precisam da inferior. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}

/** Contêiner de tela: safe areas, fundo, espaçamento e rolagem sem alturas fixas. */
export function Screen({
  children,
  scroll = true,
  edges = ['top', 'left', 'right'],
  contentStyle,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
});
