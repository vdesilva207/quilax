import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#22C55E', '#FFFFFF'];

type Piece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  height: number;
  color: string;
  rotate: number;
  drift: number;
};

type Props = {
  active?: boolean;
  count?: number;
};

/**
 * Confetti ligero (sin deps): cae al montar / al activar.
 */
export function ConfettiBurst({ active = true, count = 48 }: Props) {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * width,
        delay: Math.random() * 350,
        duration: 2200 + Math.random() * 1600,
        size: 6 + Math.random() * 8,
        height: 6 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 120,
      })),
    [count, width],
  );

  if (!active) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} fall={height + 40} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, fall }: { piece: Piece; fall: number }) {
  const y = useRef(new Animated.Value(-20)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, {
        toValue: fall,
        duration: piece.duration,
        delay: piece.delay,
        useNativeDriver: true,
      }),
      Animated.timing(x, {
        toValue: piece.drift,
        duration: piece.duration,
        delay: piece.delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 1,
        duration: piece.duration,
        delay: piece.delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: piece.duration * 0.35,
        delay: piece.delay + piece.duration * 0.65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fall, opacity, piece, rotate, x, y]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: [`${piece.rotate}deg`, `${piece.rotate + 540}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: piece.left,
          width: piece.size,
          height: piece.height,
          backgroundColor: piece.color,
          opacity,
          transform: [{ translateY: y }, { translateX: x }, { rotate: spin }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 50,
    elevation: 50,
  },
  piece: {
    position: 'absolute',
    top: 0,
    borderRadius: 2,
  },
});
