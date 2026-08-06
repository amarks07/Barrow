import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Check } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { Card } from "../ui/Card";
import { ColorSwitch } from "../ui/ColorSwitch";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

const WORKOUT_VIEW_OPTIONS = [
  {
    value: "classic",
    label: "Classic",
    description: "Tap an exercise to expand it in place and log sets right there in the list.",
  },
  {
    value: "focus",
    label: "Focus",
    description: "Tap an exercise to open it full-screen. Swipe or use the arrows to move through the workout one exercise (or superset) at a time.",
  },
];

export function PreferencesView({
  unit, onUnitChange, theme, onThemeChange,
  workoutView, onWorkoutViewChange,
  focusSupersetGrouping, onFocusSupersetGroupingChange,
  focusNotificationEnabled, onFocusNotificationToggle,
  onClose,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

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
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
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

        <View className="mb-7">
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Home &amp; lock screen
          </Text>
          <Text style={{ fontSize: 11, color: tokens.textDim, lineHeight: 16 }} className="mb-3">
            Add the Barrow widget to your home screen to see and edit the workout open in Focus flow — navigate exercises,
            adjust reps/weight, and add or remove sets right from the widget.
          </Text>
          <Card selected={focusNotificationEnabled === "on"} style={{ padding: 12 }}>
            <Pressable
              onPress={() => onFocusNotificationToggle(focusNotificationEnabled === "on" ? "off" : "on")}
              className="flex-row items-start gap-3"
            >
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 1,
                  backgroundColor: focusNotificationEnabled === "on" ? tokens.accent : "transparent",
                  borderWidth: 1.5,
                  borderColor: focusNotificationEnabled === "on" ? tokens.accent : tokens.lineStrong,
                }}
              >
                {focusNotificationEnabled === "on" && <Check size={12} color="#121214" />}
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }}>Show workout notification</Text>
                <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2, lineHeight: 16 }}>
                  An ongoing notification for the workout open in Focus flow, with Prev / Add set / Next actions — Android
                  allows at most 3 buttons on a notification, everything else opens the app. Whether it's shown on your
                  lock screen depends on your device's own notification privacy setting.
                </Text>
              </View>
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
