import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Check, ChevronRight } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { Card } from "../ui/Card";
import { ColorSwitch } from "../ui/ColorSwitch";
import { Switch } from "../ui/Switch";
import { MenuRow } from "../ui/MenuRow";
import { PatchNotesView } from "../patchnotes/PatchNotesView";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { ACCENT_PALETTE } from "../../theme/accentPalette";
import { usePulse } from "../../hooks/usePulse";
import { CURRENT_VERSION, PATCH_NOTES } from "../../content/patchNotes";

const SWATCH_SIZE = 34;
const SWATCH_GAP = 12;
// How close to the end (in px) counts as "there", so float rounding from
// the scroll events doesn't leave the indicator stuck on by a fraction of a
// pixel.
const SCROLL_END_SLOP = 4;

// Own component (not inlined in PreferencesView) so its scroll position —
// updated on every onScroll frame — doesn't re-render the rest of the
// preferences screen. Shows a small chevron badge floating over the right
// edge whenever there are swatches scrolled off past it; disappears once
// the row is scrolled all the way to its end.
function AccentColorPicker({ accentColor, onAccentColorChange, tokens }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const hasMore = contentWidth - containerWidth - scrollX > SCROLL_END_SLOP;

  return (
    <View style={{ marginTop: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
        contentContainerStyle={{ gap: SWATCH_GAP, paddingRight: 4 }}
      >
        {ACCENT_PALETTE.map((opt) => {
          const active = accentColor === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onAccentColorChange(opt.value)}
              accessibilityRole="radio"
              accessibilityLabel={opt.label}
              accessibilityState={{ checked: active }}
              style={{
                width: SWATCH_SIZE,
                height: SWATCH_SIZE,
                borderRadius: SWATCH_SIZE / 2,
                backgroundColor: opt.accent,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 2.5 : 0,
                borderColor: tokens.text,
              }}
            >
              {active && <Check size={15} color="#121214" />}
            </Pressable>
          );
        })}
      </ScrollView>

      {hasMore && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", right: -4, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: tokens.surface,
              borderWidth: 1.5,
              borderColor: tokens.lineStrong,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={13} color={tokens.textDim} />
          </View>
        </View>
      )}
    </View>
  );
}

const WORKOUT_VIEW_OPTIONS = [
  {
    value: "focus",
    label: "Focus",
    description: "Tap an exercise to open it full-screen. Swipe or use the arrows to move through the workout one exercise (or superset) at a time.",
  },
  {
    value: "classic",
    label: "List",
    description: "Tap an exercise to expand it in place and log sets right there in the list.",
  },
];

export function PreferencesView({
  unit, onUnitChange, theme, onThemeChange,
  accentColor, onAccentColorChange,
  workoutView, onWorkoutViewChange,
  focusSupersetGrouping, onFocusSupersetGroupingChange,
  notificationsEnabled, onNotificationsToggle,
  plateCalculatorEnabled, onPlateCalculatorEnabledChange,
  stretchRoutinesEnabled, onStretchRoutinesEnabledChange,
  workoutTimerEnabled, onWorkoutTimerEnabledChange,
  workoutTimerAutoOpenSummary, onWorkoutTimerAutoOpenSummaryChange,
  signedIn, biometricEnabled, onEnableBiometric, onDisableBiometric,
  onClose,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [biometricPulse, triggerBiometricPulse] = usePulse();
  const [plateCalculatorPulse, triggerPlateCalculatorPulse] = usePulse();
  const [stretchRoutinesPulse, triggerStretchRoutinesPulse] = usePulse();
  const [workoutTimerPulse, triggerWorkoutTimerPulse] = usePulse();
  const [notificationsPulse, triggerNotificationsPulse] = usePulse();

  if (showPatchNotes) {
    return <PatchNotesView onBack={() => setShowPatchNotes(false)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <View
        className="flex-row items-center gap-3 px-5 pb-4"
        style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
      >
        <IconBtn label="Close" onPress={onClose}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Preferences</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 + insets.bottom }}>
        <View className="mb-7">
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Units
          </Text>
          <ColorSwitch
            value={unit}
            onChange={onUnitChange}
            options={[
              { value: "lb", label: "LB" },
              { value: "kg", label: "KG" },
            ]}
          />
        </View>

        <View className="mb-7">
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Appearance
          </Text>
          <ColorSwitch
            value={theme}
            onChange={onThemeChange}
            options={[
              { value: "system", label: "Auto" },
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />

          <AccentColorPicker accentColor={accentColor} onAccentColorChange={onAccentColorChange} tokens={tokens} />
        </View>

        <View className="mb-7">
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Workout view
          </Text>
          <View style={{ gap: 8 }}>
            {WORKOUT_VIEW_OPTIONS.map((opt) => {
              const active = workoutView === opt.value;
              return (
                <Card key={opt.value} selected={active} style={{ padding: 12 }}>
                  <Pressable onPress={() => onWorkoutViewChange(opt.value)} className="flex-row items-start gap-3">
                    <View
                      className="items-center justify-center rounded-full"
                      style={{
                        width: 18,
                        height: 18,
                        marginTop: 1,
                        backgroundColor: active ? tokens.accent : "transparent",
                        borderWidth: 1.5,
                        borderColor: active ? tokens.accent : tokens.lineStrong,
                      }}
                    >
                      {active && <Check size={12} color="#121214" />}
                    </View>
                    <View className="flex-1">
                      <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>{opt.label}</Text>
                      <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2, lineHeight: 16 }}>{opt.description}</Text>
                    </View>
                  </Pressable>

                  {opt.value === "focus" && active && (
                    <View className="mt-3 pt-3" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line, paddingLeft: 30 }}>
                      <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-1.5">
                        Supersets in focus view
                      </Text>
                      <ColorSwitch
                        value={focusSupersetGrouping}
                        onChange={onFocusSupersetGroupingChange}
                        options={[
                          { value: "together", label: "Together" },
                          { value: "separate", label: "Separate" },
                        ]}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        </View>

        {/* No Face ID/fingerprint API on web, and nothing to unlock if
            there's no account signed in yet. */}
        {Platform.OS !== "web" && signedIn && (
          <View className="mb-7">
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
              Account security
            </Text>
            <Card style={{ padding: 12 }} pulse={biometricPulse}>
              <Pressable
                onPress={() => {
                  triggerBiometricPulse();
                  if (biometricEnabled) onDisableBiometric();
                  else onEnableBiometric();
                }}
                className="flex-row items-center gap-3"
              >
                <View className="flex-1">
                  <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>Face ID / fingerprint unlock</Text>
                  <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2, lineHeight: 16 }}>
                    Require biometric confirmation to open your profile.
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onChange={(next) => {
                    triggerBiometricPulse();
                    if (next) onEnableBiometric();
                    else onDisableBiometric();
                  }}
                />
              </Pressable>
            </Card>
          </View>
        )}

        <View className="mb-7">
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Features
          </Text>
          <View style={{ gap: 8 }}>
            <Card style={{ padding: 12 }} pulse={plateCalculatorPulse}>
              <Pressable
                onPress={() => {
                  triggerPlateCalculatorPulse();
                  onPlateCalculatorEnabledChange(!plateCalculatorEnabled);
                }}
                className="flex-row items-center gap-3"
              >
                <View className="flex-1">
                  <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>Plate calculator</Text>
                  <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2, lineHeight: 16 }}>
                    Show a bar-loading breakdown — plates per side for the weight you're entering — below the weight editor.
                  </Text>
                </View>
                <Switch
                  value={plateCalculatorEnabled}
                  onChange={(next) => {
                    triggerPlateCalculatorPulse();
                    onPlateCalculatorEnabledChange(next);
                  }}
                />
              </Pressable>
            </Card>

            <Card style={{ padding: 12 }} pulse={stretchRoutinesPulse}>
              <Pressable
                onPress={() => {
                  triggerStretchRoutinesPulse();
                  onStretchRoutinesEnabledChange(!stretchRoutinesEnabled);
                }}
                className="flex-row items-center gap-3"
              >
                <View className="flex-1">
                  <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>Enable stretch routines</Text>
                  <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2, lineHeight: 16 }}>
                    Adds a Stretches tab where you can build a named list of poses, each with its own hold time, then run
                    through it and start the countdowns.
                  </Text>
                </View>
                <Switch
                  value={stretchRoutinesEnabled}
                  onChange={(next) => {
                    triggerStretchRoutinesPulse();
                    onStretchRoutinesEnabledChange(next);
                  }}
                />
              </Pressable>
            </Card>

            <Card style={{ padding: 12 }} pulse={workoutTimerPulse}>
              <Pressable
                onPress={() => {
                  triggerWorkoutTimerPulse();
                  onWorkoutTimerEnabledChange(!workoutTimerEnabled);
                }}
                className="flex-row items-center gap-3"
              >
                <View className="flex-1">
                  <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>Workout timer</Text>
                  <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2, lineHeight: 16 }}>
                    Adds a Start workout button to Day and Focus view. Once started, a running timer and End workout
                    button stay in the corner until you end it.
                  </Text>
                </View>
                <Switch
                  value={workoutTimerEnabled}
                  onChange={(next) => {
                    triggerWorkoutTimerPulse();
                    onWorkoutTimerEnabledChange(next);
                  }}
                />
              </Pressable>

              {workoutTimerEnabled && (
                <View className="mt-3 pt-3" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line, paddingLeft: 30 }}>
                  <Pressable
                    onPress={() => onWorkoutTimerAutoOpenSummaryChange(!workoutTimerAutoOpenSummary)}
                    className="flex-row items-center gap-3"
                  >
                    <View className="flex-1">
                      <Text style={{ fontSize: 13, fontWeight: "500", color: tokens.text }}>Open summary on end</Text>
                      <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2, lineHeight: 16 }}>
                        Jump straight to the workout summary when you end the timer.
                      </Text>
                    </View>
                    <Switch value={workoutTimerAutoOpenSummary} onChange={onWorkoutTimerAutoOpenSummaryChange} />
                  </Pressable>
                </View>
              )}
            </Card>

            {Platform.OS !== "web" && (
              <Card style={{ padding: 12 }} pulse={notificationsPulse}>
                <Pressable
                  onPress={() => {
                    triggerNotificationsPulse();
                    onNotificationsToggle(notificationsEnabled === "on" ? "off" : "on");
                  }}
                  className="flex-row items-center gap-3"
                >
                  <View className="flex-1">
                    <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>Allow notifications</Text>
                    <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2, lineHeight: 16 }}>
                      Lets Barrow show notifications, such as friend requests. If it doesn't turn on, allow
                      notifications for Barrow in your device settings.
                    </Text>
                  </View>
                  <Switch
                    value={notificationsEnabled === "on"}
                    onChange={(next) => {
                      triggerNotificationsPulse();
                      onNotificationsToggle(next ? "on" : "off");
                    }}
                  />
                </Pressable>
              </Card>
            )}
          </View>
        </View>

        {PATCH_NOTES.length > 0 && (
          <View className="mb-7">
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
              About
            </Text>
            <MenuRow label="Patch notes" subtitle={`Version ${CURRENT_VERSION}`} onPress={() => setShowPatchNotes(true)} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
