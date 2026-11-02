import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg from "react-native-svg";
import { useTheme } from "../../theme";
import { sceneSpec, type SceneSpec } from "../../theme/scenes";
import { motion, radii } from "../../theme/tokens";
import { SceneryArtwork, StarField, Celestial } from "./SceneryArtwork";
export function ScenePreview({
  spec,
  height = 135,
}: {
  spec: SceneSpec;
  height?: number;
}) {
  return (
    <View
      accessible={false}
      style={{ height, borderRadius: radii.card, overflow: "hidden" }}
    >
      <SceneryArtwork spec={spec} />
    </View>
  );
}
export function SceneHero() {
  const {
    preferences,
    period,
    animate: enabled,
    appActive,
    claimOpening,
    now,
  } = useTheme();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const animate = enabled && focused && appActive;
  const spec = sceneSpec(preferences.theme, period, preferences.scene),
    key = `${spec.theme}:${spec.pack}:${period}`;
  const last = useRef({ key, spec }),
    [previous, setPrevious] = useState<SceneSpec | null>(null),
    fade = useRef(new Animated.Value(1)).current;
  const rise = useRef(new Animated.Value(0)).current,
    twinkle = useRef(new Animated.Value(0.75)).current;
  useEffect(() => {
    if (!animate) {
      fade.stopAnimation();
      fade.setValue(1);
      setPrevious(null);
      last.current = { key, spec };
      return;
    }
    if (last.current.key === key) return;
    const old = last.current.spec;
    last.current = { key, spec };
    fade.stopAnimation();
    setPrevious(old);
    fade.setValue(0);
    const transition = Animated.timing(fade, {
      toValue: 1,
      duration: motion.transition,
      useNativeDriver: true,
      isInteraction: false,
    });
    transition.start(({ finished }) => {
      if (finished) setPrevious(null);
    });
    return () => transition.stop();
    // spec is an immutable snapshot identified by key; do not restart on clock rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, animate, fade]);
  useEffect(() => {
    if (!animate) {
      rise.setValue(0);
      return;
    }
    if (period !== "morning" || !claimOpening(now, period)) return;
    rise.setValue(30);
    const animation = Animated.timing(rise, {
      toValue: 0,
      duration: motion.sun,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
    // claimOpening is backed by an app-lifetime set. Tab navigation cannot replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, animate, rise]);
  useEffect(() => {
    if (!animate || period !== "night") {
      twinkle.setValue(0.75);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: 0.35,
          duration: motion.twinkle,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(twinkle, {
          toValue: 0.85,
          duration: motion.twinkle,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, period, twinkle]);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${preferences.scene} scenery, ${period}`}
      style={{ height: 250, borderRadius: radii.hero, overflow: "hidden" }}
    >
      {previous && (
        <View style={StyleSheet.absoluteFill}>
          <SceneryArtwork spec={previous} />
        </View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <SceneryArtwork spec={spec} celestial={false} stars={false} />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: rise }] },
          ]}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 240"
            preserveAspectRatio="xMidYMid slice"
          >
            <Celestial spec={spec} />
          </Svg>
        </Animated.View>
        {period === "night" && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: twinkle }]}
          >
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 400 240"
              preserveAspectRatio="xMidYMid slice"
            >
              <StarField color={spec.palette.star} />
            </Svg>
          </Animated.View>
        )}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <SceneryArtwork
            spec={spec}
            sky={false}
            celestial={false}
            stars={false}
          />
        </View>
      </Animated.View>
    </View>
  );
}
