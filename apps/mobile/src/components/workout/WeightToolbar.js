import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PlateCalculatorBar } from "./PlateCalculatorBar";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { CHIP_HEIGHT } from "../../theme/dimensions";

// One entry per weight-specific tool that can open above the chip row.
// Plate calculator is the only one today; add more here as they show up
// rather than growing WeightEditModal's own prop list.
const TOOLS = [{ id: "plates", label: "Plate Calculator" }];

// Sits between the Counter input and the keyboard (see WeightEditModal,
// which is what puts it there). A row of chips picks which tool — if
// any — renders above the row, instead of the old always-on plate
// calculator eating that space whether or not it was wanted.
export function WeightToolbar({ value, unit, focusInput }) {
  const { tokens } = useTheme();
  const [openTool, setOpenTool] = useState(null);

  // Unlike the backdrop/close-button/bar-weight taps documented over in
  // CounterEditModal and PlateCalculatorBar — all fine losing focus, since
  // they're closing something — a tool chip should leave the user free to
  // keep typing. `focusable={false}` below (Android) stops the chip from
  // ever taking view focus in the first place, which is what was pulling
  // focus, and the keyboard, off the Counter input on tap. focusInput() is
  // a belt-and-suspenders reassert for anything that slips past that.
  const selectTool = (id) => {
    setOpenTool((current) => (current === id ? null : id));
    focusInput?.();
  };

  return (
    <View>
      {openTool === "plates" && <PlateCalculatorBar value={value} unit={unit} />}

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderTopWidth: openTool ? 1.5 : 0,
          borderTopColor: tokens.line,
        }}
      >
        {TOOLS.map(({ id, label }) => {
          const active = openTool === id;
          return (
            <Pressable
              key={id}
              onPressIn={() => selectTool(id)}
              focusable={false}
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              style={{
                height: CHIP_HEIGHT,
                paddingHorizontal: 12,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: active ? tokens.accent : tokens.surface,
                borderWidth: 1.5,
                borderColor: active ? tokens.accent : tokens.lineStrong,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 13,
                  includeFontPadding: false,
                  textAlignVertical: "center",
                  color: active ? tokens.onAccent : tokens.textDim,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
