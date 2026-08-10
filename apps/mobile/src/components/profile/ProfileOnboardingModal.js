import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Info, User, X } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { IconBtn } from "../ui/IconBtn";
import { BirthdayPicker } from "./BirthdayPicker";
import { GenderPicker } from "./GenderPicker";
import { HeightPicker } from "./HeightPicker";
import { WeightPicker } from "./WeightPicker";
import { getMissingProfileFields } from "../../hooks/useProfileOnboarding";

const FIELD_CONFIG = {
  birthday: { title: "Birthday", Picker: BirthdayPicker },
  gender: { title: "Gender", Picker: GenderPicker },
  height: { title: "Height", Picker: HeightPicker },
  weight: { title: "Weight", Picker: WeightPicker },
};

// Shown once on app open (see useProfileOnboarding) when birthday, gender,
// height, or weight hasn't been entered yet. Three steps:
//  - "intro": the initial prompt, offering Skip / Don't ask again / Continue.
//  - one of PROFILE_ONBOARDING_FIELDS: reuses BiometricsView's own picker
//    components directly (same value/onChange shape as profile/updateProfile)
//    so answers land in the exact same fields Biometrics edits, cycling only
//    through whichever fields were actually missing when Continue was tapped.
//  - "omitted": the notice shown after "Don't ask again".
// Skip (and abandoning the cycle via the X/backdrop) just closes for this
// session — onClose alone, no asked-flag — so the prompt returns next
// launch. "Don't ask again" and finishing the cycle both call onPersistAsked
// so it doesn't come back.
export function ProfileOnboardingModal({ profile, onUpdate, onClose, onPersistAsked }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState("intro");
  const [cycleFields, setCycleFields] = useState([]);
  const [cycleIndex, setCycleIndex] = useState(0);
  const isTopCard = step === "intro" || step === "omitted";

  const topSlide = useRef(new Animated.Value(-1000)).current;
  const bottomSlide = useRef(new Animated.Value(1000)).current;

  useEffect(() => {
    const anim = isTopCard ? topSlide : bottomSlide;
    anim.setValue(isTopCard ? -1000 : 1000);
    Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const startCycle = () => {
    const missing = getMissingProfileFields(profile);
    if (missing.length === 0) {
      onPersistAsked();
      onClose();
      return;
    }
    setCycleFields(missing);
    setCycleIndex(0);
    setStep(missing[0]);
  };

  const advanceCycle = () => {
    const next = cycleIndex + 1;
    if (next < cycleFields.length) {
      setCycleIndex(next);
      setStep(cycleFields[next]);
    } else {
      onPersistAsked();
      onClose();
    }
  };

  const handleDontAskAgain = () => {
    onPersistAsked();
    setStep("omitted");
  };

  const linkTextStyle = {
    fontFamily: FONT_DISPLAY,
    fontSize: 13,
    lineHeight: 13,
    textTransform: "uppercase",
    includeFontPadding: false,
    textAlignVertical: "center",
    color: tokens.textDim,
  };

  const field = FIELD_CONFIG[step];
  const Picker = field?.Picker;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      {isTopCard ? (
        <>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
            onPress={onClose}
          />
          <Animated.View
            className="p-5"
            style={{
              backgroundColor: tokens.bg,
              borderBottomWidth: 1.5,
              borderBottomColor: tokens.line,
              paddingTop: insets.top + 20,
              transform: [{ translateY: topSlide }],
            }}
          >
            {step === "intro" ? (
              <>
                <View className="flex-row items-center gap-3 mb-2">
                  <User size={22} color={tokens.accent} />
                  <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Complete your profile</Text>
                </View>
                <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }} className="mb-4">
                  Add your birthday, gender, height, and weight to unlock more useful stats about your exercises and
                  workouts.
                </Text>
                <Button label="Continue" onPress={startCycle} variant="solid" size="medium" fullWidth style={{ marginBottom: 14 }} />
                <View className="flex-row items-center justify-between">
                  <Pressable onPress={onClose} accessibilityLabel="Skip">
                    <Text style={linkTextStyle}>Skip</Text>
                  </Pressable>
                  <Pressable onPress={handleDontAskAgain} accessibilityLabel="Don't ask again">
                    <Text style={linkTextStyle}>Don't ask again</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View className="flex-row items-center gap-3 mb-2">
                  <Info size={22} color={tokens.accent} />
                  <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Got it</Text>
                </View>
                <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }} className="mb-4">
                  Some data on workout performance and outcomes may be omitted until you enter your birthday, gender,
                  height, and weight from the Profile settings screen.
                </Text>
                <Button label="Got it" onPress={onClose} variant="solid" size="medium" fullWidth />
              </>
            )}
          </Animated.View>
        </>
      ) : (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          />
          <Animated.View
            style={{
              backgroundColor: tokens.bg,
              borderTopWidth: 1.5,
              borderTopColor: tokens.line,
              paddingBottom: Math.max(16, insets.bottom),
              transform: [{ translateY: bottomSlide }],
            }}
          >
            <View
              className="flex-row items-center gap-3 px-5 pb-4 pt-4"
              style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
            >
              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: tokens.text, flex: 1 }}>{field?.title}</Text>
              <Text style={{ fontSize: 12, color: tokens.textDim }}>
                {cycleIndex + 1} of {cycleFields.length}
              </Text>
              <IconBtn label="Close" onPress={onClose}>
                <X size={17} color={tokens.text} />
              </IconBtn>
            </View>
            <View className="items-center py-6">
              {Picker && <Picker value={profile[step]} onChange={(v) => onUpdate(step, v)} />}
            </View>
            <View className="px-5">
              <Button
                label={cycleIndex + 1 < cycleFields.length ? "Next" : "Done"}
                onPress={advanceCycle}
                size="large"
                variant="solid"
                fullWidth
              />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}
