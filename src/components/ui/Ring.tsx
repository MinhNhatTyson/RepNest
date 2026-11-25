import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  strokeWidth: number;
  progress: number; // 0..1
  color?: string;
  trackColor?: string;
  duration?: number;
  children?: ReactNode; // shown in the middle
};

export function Ring({
  size,
  strokeWidth,
  progress,
  color = colors.primary,
  trackColor = colors.surfaceRaised,
  duration = 700,
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.min(1, Math.max(0, progress));
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // useNativeDriver must be false: SVG props are not driven natively.
    Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, target, duration]);

  const dashOffset = anim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });
  // A round cap at 0 would draw a stray dot, so the arc fades in with the first progress.
  const opacity = anim.interpolate({
    inputRange: [0, 0.01],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotated}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          opacity={opacity}
          fill="none"
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotated: { transform: [{ rotate: '-90deg' }] }, // start at 12 o'clock
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
