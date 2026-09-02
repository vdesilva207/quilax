import React, { type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const EASE_OUT = Easing.out(Easing.cubic);

/** Soft screen enter — no spring bounce */
export function ScreenEnter({
  children,
  style,
  delay = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(280).delay(delay).easing(EASE_OUT)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Header / hero — fade only (no zoom bounce) */
export function HeroEnter({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeIn.duration(260).easing(EASE_OUT)} style={style}>
      {children}
    </Animated.View>
  );
}

/** List item stagger — ease, no spring */
export function StaggerItem({
  index = 0,
  children,
  style,
  maxDelay = 280,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  maxDelay?: number;
}) {
  const delay = Math.min(index * 40, maxDelay);
  return (
    <Animated.View
      entering={FadeInRight.duration(300).delay(delay).easing(EASE_OUT)}
      layout={LinearTransition.duration(220).easing(EASE_OUT)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Section fade */
export function FadeBlock({
  children,
  delay = 40,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(280).delay(delay).easing(EASE_OUT)}
      exiting={FadeOut.duration(140)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

type PressScaleProps = PressableProps & {
  children: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

/** Light press feedback without bouncy spring */
export function PressScale({
  children,
  scaleTo = 0.98,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) scale.value = withTiming(scaleTo, { duration: 90, easing: EASE_OUT });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 120, easing: EASE_OUT });
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export const MotionLayout = LinearTransition.duration(220).easing(EASE_OUT);
