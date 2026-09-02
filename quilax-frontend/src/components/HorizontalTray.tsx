import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Platform,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  /** Optional caption under the scroll area, e.g. "Desliza para ver más" */
  footerHint?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  height?: number;
};

/**
 * Panel vertical anidado para listas del home.
 * Altura fija + scroll interno. En web usa overflow explícito para que se vea.
 */
export function NestedScrollTray({
  children,
  footerHint,
  style,
  contentStyle,
  height = 248,
}: Props) {
  return (
    <View style={[styles.panel, style]}>
      <View style={[styles.viewport, { height }]}>
        {Platform.OS === 'web' ? (
          <View
            // @ts-expect-error overflowY is valid on RN web
            style={[styles.scrollWeb, { height }, contentStyle]}
          >
            {children}
          </View>
        ) : (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            bounces
            style={{ height }}
            contentContainerStyle={[styles.content, contentStyle]}
          >
            {children}
          </ScrollView>
        )}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,252,248,0)', 'rgba(255,252,248,0.92)']}
          style={styles.fade}
        />
      </View>
      {footerHint ? <Text style={styles.hint}>{footerHint}</Text> : null}
    </View>
  );
}

export const HorizontalTray = NestedScrollTray;

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2DA',
    backgroundColor: Colors.light.background,
    overflow: 'hidden',
  },
  viewport: {
    position: 'relative',
  },
  scrollWeb: {
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    // @ts-expect-error web
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
  },
  hint: {
    ...titleTypeface,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E2DA',
    backgroundColor: '#FFFCFA',
  },
});

export default NestedScrollTray;
