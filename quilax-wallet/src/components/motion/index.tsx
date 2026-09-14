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
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';

const EASE_OUT = Easing.out(Easing.cubic);

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
      entering={FadeInDown.duration(420).delay(delay).easing(EASE_OUT).springify().damping(18)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function HeroEnter({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeIn.duration(380).easing(EASE_OUT)} style={style}>
      <Animated.View entering={ZoomIn.duration(480).springify().damping(16)}>{children}</Animated.View>
    </Animated.View>
  );
}

export function StaggerItem({
  index = 0,
  children,
  style,
  maxDelay = 360,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  maxDelay?: number;
}) {
  const delay = Math.min(index * 45, maxDelay);
  return (
    <Animated.View
      entering={FadeInRight.duration(340).delay(delay).easing(EASE_OUT)}
      layout={LinearTransition.springify().damping(18)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function FadeBlock({
  children,
  delay = 80,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(360).delay(delay).easing(EASE_OUT)}
      exiting={FadeOut.duration(160)}
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

export function PressScale({
  children,
  scaleTo = 0.97,
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
      style={style}
      onPressIn={(e) => {
        if (!disabled) scale.value = withSpring(scaleTo, { damping: 16, stiffness: 320 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

export const MotionLayout = LinearTransition.springify().damping(18);
