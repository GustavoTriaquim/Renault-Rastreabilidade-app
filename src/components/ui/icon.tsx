import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color: ColorValue;
}

/** Único ponto de acesso a ícones, para manter o conjunto consistente. */
export function Icon({ name, size = 20, color }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} accessible={false} />;
}
