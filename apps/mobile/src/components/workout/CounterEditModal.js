import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView, KeyboardEvents, useKeyboardHandler } from "react-native-keyboard-controller";
import { scheduleOnRN } from "react-native-worklets";
import { X } from "lucide-react-native";
import { Counter } from "./Counter";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Bottom sheet opened by tapping any set field's value (see Counter's
// `onPress` mode) — a bigger stepper than fits inline, with room below for
// field-specific helpers (WeightEditModal's WeightToolbar is the one example
// so far), passed as `children` — either a plain node, or a function taking
// this modal's `focusInput` if the helper has its own tappable bits that
// would otherwise blur the input. Has to be a Modal-hosted sheet
// rather than something mounted alongside the field: RN's Modal renders in
// its own native layer above the rest of the app, so anything meant to sit
// on top of this modal's keyboard has to be inside the modal itself.
// KeyboardAvoidingView's "padding" behavior (same pattern as
// SaveAsRoutineModal) pushes the whole sheet up as the keyboard opens,
// carrying `children` with it.
export function CounterEditModal({ title, label, value, onChangeValue, onInc, onDec, onClose, children }) {
  const { tokens } = useTheme();
  const inputRef = useRef(null);
  // Handed to `children` (as a render prop) so anything below the input —
  // e.g. WeightToolbar's chips — can restore focus after a tap of its own
  // steals it, without needing this modal's own ref.
  const focusInput = () => inputRef.current?.focus();

  const slideAnim = useRef(new Animated.Value(1000)).current;
  // The sheet starts translated fully off-screen (see slideAnim's initial
  // value) and slides in — focusing at mount, while still off-screen, gets
  // silently ignored on iOS (a view has to actually be on-screen to become
  // first responder). Focusing only once the slide-in finishes is what
  // actually raises the keyboard.
  //
  // setSelection right after is a one-shot, imperative select-all for this
  // initial focus only — deliberately not `selectTextOnFocus` (a declarative
  // prop that would re-select on every focus this input receives, including
  // the defensive refocus calls below and WeightToolbar's focusInput(),
  // fighting the user's own selection/cursor mid-edit).
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelection(0, String(value).length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideAnim]);

  // The parent unmounts this whole component (Modal included) the instant
  // onClose fires — it conditionally renders CounterEditModal/WeightEditModal
  // rather than toggling a `visible` prop. So closing has to slide out first
  // and only call the real onClose once that animation finishes; calling
  // onClose directly would yank the sheet off-screen with no animation at all.
  const closingRef = useRef(false);
  const handleClose = (duration = 250) => {
    closingRef.current = true;
    Animated.timing(slideAnim, { toValue: 1000, duration, useNativeDriver: true }).start(onClose);
  };

  // Android blurs (and hides the keyboard for) the autoFocused Counter input
  // on essentially any touch inside this sheet — not just Pressables (see
  // Counter.js/PlateCalculatorBar.js's focusable={false} for that half of
  // it), but reportedly even a tap on plain, non-interactive space with
  // nothing under the finger at all. There's no reliable way to prevent that
  // at the source, so instead: notice any touch starting inside the sheet
  // (capture phase, returns false so it never actually claims the responder
  // or blocks the real target underneath), and if the keyboard hides shortly
  // after with no legitimate close in progress and no real interactive
  // dismiss gesture, just refocus — bringing the keyboard right back instead
  // of leaving the sheet open with a dead input. A hardware back press has no
  // associated touch at all, so it never sets this and is unaffected: the
  // first press still closes the keyboard (standard Android behavior) and a
  // second reaches Modal's onRequestClose normally.
  const recentTouchRef = useRef(0);
  const RECENT_TOUCH_WINDOW_MS = 500;
  const markTouch = () => {
    recentTouchRef.current = Date.now();
    return false;
  };

  // Closes the sheet along with the keyboard when it's dismissed some way
  // other than the explicit close button/backdrop tap — an iOS interactive
  // swipe-down-to-dismiss, or an Android equivalent, which closes the
  // keyboard without otherwise touching this component (the hardware back
  // button is handled separately by the Modal's onRequestClose below).
  // Listens for `keyboardWillHide` so the sheet starts sliding away the
  // instant the keyboard's own hide animation begins, and reuses the
  // event's own `duration` so the two finish together.
  //
  // A `keyboardWillHide` also fires for reasons that have nothing to do
  // with dismissing the sheet — tapping any Pressable inside it (the +/-
  // buttons, PlateCalculatorBar's bar-weight toggle, ...) blurs the
  // autoFocused Counter input the same way. Trying to tell those apart by
  // having every such button flag "this hide is incidental" from onPressIn
  // raced the keyboard event and lost as often as it won, since this
  // library dispatches keyboard events on the UI thread ahead of the
  // ordinary JS-thread Pressable callback. `onInteractive` sidesteps that
  // race entirely: it only ever fires for actual drag frames of a keyboard
  // dismiss gesture, never for a plain blur, so arming from it — rather
  // than from every button that might cause a blur — can't lose the race.
  const interactiveDismissRef = useRef(false);
  const markInteractiveDismiss = () => {
    interactiveDismissRef.current = true;
  };
  useKeyboardHandler(
    {
      onInteractive: () => {
        "worklet";
        scheduleOnRN(markInteractiveDismiss);
      },
    },
    [],
  );

  useEffect(() => {
    const willHide = KeyboardEvents.addListener("keyboardWillHide", (e) => {
      if (interactiveDismissRef.current) {
        interactiveDismissRef.current = false;
        handleClose(e.duration);
      }
    });
    // Belt-and-suspenders for whatever native focus-loss Android decides to
    // trigger on its own — a tap that's neither an explicit close (X/
    // backdrop, which set closingRef above) nor a real interactive dismiss
    // (handled above) shouldn't be able to touch the keyboard at all, no
    // matter what caused it. If the keyboard finishes hiding without either
    // of those, and there was a touch somewhere in this sheet recently
    // (ruling out a hardware back press, which has no associated touch and
    // should be left alone to behave normally), just refocus.
    const didHide = KeyboardEvents.addListener("keyboardDidHide", () => {
      const hadRecentTouch = Date.now() - recentTouchRef.current < RECENT_TOUCH_WINDOW_MS;
      if (!closingRef.current && hadRecentTouch) {
        inputRef.current?.focus();
      }
    });
    return () => {
      willHide.remove();
      didHide.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal transparent animationType="none" visible onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        // Capture phase, on the whole sheet: fires for any touch anywhere in
        // here — including plain empty space with nothing under it — without
        // claiming the responder (returns false), so it never blocks the
        // real target underneath. Feeds the keyboardDidHide listener above.
        onStartShouldSetResponderCapture={markTouch}
      >
        {/* flex: 1, not absolute-positioned over the sheet: an absolute
            backdrop spanning the whole modal overlaps the sheet's own area,
            leaving it up to paint order alone to keep the sheet's touches
            (e.g. PlateCalculatorBar's bar-weight toggle) from leaking to
            this Pressable underneath. Giving the backdrop flex: 1 makes it
            a normal-flow sibling that only occupies the space above the
            sheet, so the two never geometrically overlap.

            onPressIn, not onPress: the field below is autoFocused, so this
            same tap also blurs it and starts the keyboard closing — which
            reflows this sheet (KeyboardAvoidingView) out from under the
            finger before touch-up. That moved target makes Pressable treat
            the gesture as cancelled rather than a completed press, so
            onPress here would only fire on a second, keyboard-already-
            closed tap. onPressIn fires at touch-down, before any of that
            reflow happens, so one tap reliably closes both. */}
        <Pressable
          onPressIn={() => handleClose()}
          focusable={false}
          accessibilityLabel="Close"
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
        />
        <Animated.View
          style={{
            backgroundColor: tokens.bg,
            borderTopWidth: 1.5,
            borderTopColor: tokens.line,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            className="flex-row items-center gap-3 px-5 pb-4 pt-4"
            style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
          >
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: tokens.text, flex: 1 }}>{title}</Text>
            <Pressable onPressIn={() => handleClose()} focusable={false} accessibilityLabel="Close" hitSlop={8} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <X size={17} color={tokens.text} />
            </Pressable>
          </View>

          <View className="px-5 py-6">
            <Counter ref={inputRef} label={label} value={value} onChangeValue={onChangeValue} onInc={onInc} onDec={onDec} />
          </View>

          {typeof children === "function" ? children(focusInput) : children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
