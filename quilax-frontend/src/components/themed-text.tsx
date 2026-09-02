import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor, sora } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    ...sora(500),
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    ...sora(700),
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    ...sora(500),
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    ...sora(600),
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    ...sora(600),
    fontSize: 32,
    lineHeight: 44,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    ...sora(Platform.OS === 'android' ? 700 : 500),
    fontSize: 12,
  },
});
