import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from '@/theme/tokens';

import { Text } from './ui/Text';

/** Marca: um "A" geométrico que também lê como um pódio/pico em ascensão. */
export function LogoMark({ size = 40, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 4 L44 44 H34 L24 23 L14 44 H4 Z" fill={color} />
      <Path d="M19 36 H29 L26.5 31 H21.5 Z" fill={color} opacity={0.55} />
    </Svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.35 }}>
      <LogoMark size={size * 1.15} />
      <Text style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.1, letterSpacing: 1.5, color: colors.text }}>
        ARENA<Text style={{ fontFamily: fonts.display, fontSize: size, color: colors.primary }}>FIT</Text>
      </Text>
    </View>
  );
}
