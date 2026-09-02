import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export type ChromeInsets = {
  /** Safe top inset (0 inside WebPhoneFrame desktop shell). */
  top: number;
  /** Safe bottom inset (home indicator / nav). */
  bottom: number;
  /** Recommended header paddingTop (inset + content gap, or modest web shell pad). */
  headerPaddingTop: number;
  /** Recommended bottom chrome padding (tab bar / footers). */
  bottomPadding: number;
};

/**
 * Safe-area helpers that respect WebPhoneFrame on desktop web
 * (no fake notch / double padding inside the phone shell).
 */
export function useChromeInsets(contentGap: number = Spacing.three): ChromeInsets {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const webDesktop = Platform.OS === 'web' && width > MaxContentWidth + 48;

  if (webDesktop) {
    return {
      top: 0,
      bottom: 0,
      headerPaddingTop: Spacing.four,
      bottomPadding: Spacing.three,
    };
  }

  return {
    top: insets.top,
    bottom: insets.bottom,
    headerPaddingTop: insets.top + contentGap,
    bottomPadding: Math.max(insets.bottom, Spacing.two),
  };
}
