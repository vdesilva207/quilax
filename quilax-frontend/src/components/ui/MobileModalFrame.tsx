import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { MaxContentWidth } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  onBackdropPress?: () => void;
  /** 'end' = bottom sheet, 'center' = centered card */
  justify?: 'flex-end' | 'center';
  style?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<ViewStyle>;
};

/**
 * Modal shell constrained to phone width so overlays stay "mobile"
 * even when React Native Modal portals outside WebPhoneFrame on desktop web.
 */
export function MobileModalFrame({
  children,
  onBackdropPress,
  justify = 'flex-end',
  style,
  backdropStyle,
}: Props) {
  const { width } = useWindowDimensions();
  // On native use full screen width so overlays aren't stuck in a 480px column.
  const phoneWidth = Platform.OS === 'web' ? Math.min(width, MaxContentWidth) : width;

  return (
    <View style={[styles.viewport, backdropStyle]} pointerEvents="box-none">
      <View
        style={[
          styles.phoneColumn,
          { width: phoneWidth, maxWidth: Platform.OS === 'web' ? MaxContentWidth : undefined, justifyContent: justify },
          style,
        ]}
      >
        <Pressable
          style={styles.hitBackdrop}
          onPress={onBackdropPress}
          accessibilityRole="button"
        />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    alignItems: 'center',
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  phoneColumn: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  hitBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MobileModalFrame;
