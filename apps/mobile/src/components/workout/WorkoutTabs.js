import { Pressable, ScrollView, Text } from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { CHIP_HEIGHT } from "../../theme/dimensions";

// A day can have more than one workout — this switches between them and
// adds another. Deleting the active one is up in the header.
export function WorkoutTabs({ workouts, activeId, onSelect, onCreate }) {
  const { tokens } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, paddingTop: 12, paddingBottom: 12 }}
      contentContainerStyle={{ gap: 8, alignItems: "center", paddingHorizontal: 20 }}
    >
      {workouts.map((w) => {
        const active = w.id === activeId;
        return (
          <Pressable
            // Keyed on active too, not just w.id: a stable style object
            // (borderRadius always present) still wasn't enough — see
            // Button.js for why the key needs to change too.
            key={`${w.id}-${active}`}
            onPress={() => onSelect(w.id)}
            // CHIP_HEIGHT is shared with every other chip-style control in
            // the app — left to intrinsic sizing, a pill's padding + text
            // line-height doesn't reliably land on the same height twice.
            style={{
              height: CHIP_HEIGHT,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              backgroundColor: active ? tokens.accent : tokens.surface,
            }}
          >
            <Text
              // No fontWeight override here — Bebas Neue only has the one
              // loaded weight (400Regular), and asking Android to
              // synthesize bold/medium on top of a condensed display font
              // was rendering wider than the chip's intrinsic width could
              // account for, clipping the active label.
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 13,
                lineHeight: 13,
                textTransform: "uppercase",
                includeFontPadding: false,
                textAlignVertical: "center",
                color: active ? "#121214" : tokens.textDim,
              }}
            >
              {w.name || "Workout"}
            </Text>
          </Pressable>
        );
      })}
      {onCreate && (
        <Pressable
          onPress={onCreate}
          accessibilityLabel="Add another workout"
          className="items-center justify-center rounded-full"
          style={{ width: CHIP_HEIGHT, height: CHIP_HEIGHT, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
        >
          <Plus size={14} color={tokens.textDim} />
        </Pressable>
      )}
    </ScrollView>
  );
}
