import { useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const DISMISS_THRESHOLD = 80;

// Wraps a row so it can be dismissed by swiping it left or right, on top of
// whatever explicit dismiss control it already renders (NotificationsView's
// ConfirmDeleteIconButton). `activeOffsetX`/`failOffsetY` hand the gesture
// to the surrounding ScrollView until the finger has clearly moved
// horizontally, so this doesn't fight a normal vertical scroll, and a tap
// on the row's own Pressables still gets through since Pan hasn't claimed
// the touch yet at that point.
export function SwipeToDismissRow({ onDismiss, children }) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > DISMISS_THRESHOLD) {
        const direction = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * width, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
      } else {
        translateX.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: 1 - Math.min(Math.abs(translateX.value) / width, 1),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
