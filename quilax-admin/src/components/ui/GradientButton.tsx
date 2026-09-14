import { Text, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brandGradientProps } from '@/constants/gradients';
import { titleTypeface, Spacing } from '@/constants/theme';
import { PressScale } from '@/components/motion';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function GradientButton({ label, onPress, disabled, style }: Props) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.96}
      style={[styles.wrap, style, disabled && styles.disabled]}
    >
      <LinearGradient {...brandGradientProps} style={styles.grad}>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
  grad: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  label: {
    ...titleTypeface,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
