import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { theme } from '@/theme';

/** Ilustração de cada tipo de peça (chave `imageKey` dos dados). */
const ILLUSTRATIONS: Record<string, IconName> = {
  farol: 'car-light-high',
  sensor: 'radar',
  painel: 'speedometer',
  bateria: 'car-battery',
  bomba: 'water-pump',
  chicote: 'cable-data',
  espelho: 'mirror',
  retrovisor: 'car-side',
  injetor: 'needle',
  modulo: 'chip',
  pedal: 'car-brake-abs',
  radiador: 'radiator',
};

interface PartImageProps {
  imageKey: string;
  size?: number;
}

/** Imagem ilustrativa da peça. Peças desconhecidas usam um ícone genérico. */
export function PartImage({ imageKey, size = 64 }: PartImageProps) {
  return (
    <View style={[styles.frame, { width: size, height: size }]} accessible={false}>
      <Icon
        name={ILLUSTRATIONS[imageKey] ?? 'cube-outline'}
        size={Math.round(size * 0.55)}
        color={theme.colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
