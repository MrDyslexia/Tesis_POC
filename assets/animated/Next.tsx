import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export interface NextHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface NextProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
  onPress?: () => void;
}

const Next = forwardRef<
  NextHandle,
  NextProps
>(({ size = 28, color = '#000', style, onPress }, ref) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isControlledRef = useRef(false);

  const animate = useCallback(() => {
    Animated.sequence([
      Animated.timing(translateX, {
        toValue: 2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX]);

  const resetAnimation = useCallback(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: animate,
      stopAnimation: resetAnimation,
    };
  });

  const handlePressIn = useCallback(() => {
    if (!isControlledRef.current) {
      animate();
    }
  }, [animate]);

  const handlePressOut = useCallback(() => {
    if (!isControlledRef.current) {
      resetAnimation();
    }
  }, [resetAnimation]);

  // Convert Animated value to a string for SVG path
  const animatedPath = translateX.interpolate({
    inputRange: [0, 2],
    outputRange: ['M10 8 L14 12 L10 16', 'M12 8 L16 12 L12 16'],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Circle cx="12" cy="12" r="10" />
        <AnimatedPath
          d={animatedPath}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
});

// Custom component to handle animated path
const AnimatedPath = Animated.createAnimatedComponent(Path);

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});

Next.displayName = 'Next';

export { Next };
