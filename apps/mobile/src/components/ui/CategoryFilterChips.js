import { Pressable, ScrollView, Text } from "react-native";
import { CATEGORIES } from "@barrow/core";
import { FONT_DISPLAY } from "../../theme/fonts";
import { CHIP_HEIGHT } from "../../theme/dimensions";
import { useTheme } from "../../theme/ThemeProvider";

export function CategoryFilterChips({ value, onChange }) {
  const { tokens } = useTheme();
  const options = ["All", ...CATEGORIES];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, paddingBottom: 12 }}
      // Horizontal padding lives on the content container, not the outer
      // style, so it scrolls with the content — padding on the outer style
      // insets the viewport but doesn't guarantee trailing space after the
      // last chip, which is what let it end up flush against the edge
      // (effectively cut off) when scrolled all the way to the right.
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
    >
      {options.map((cat) => {
        const val = cat === "All" ? "all" : cat;
        const active = value === val;
        return (
          <Pressable
            // Keyed on active too, not just cat: a stable style object
            // (borderRadius always present) still wasn't enough — see
            // Button.js for why the key needs to change too.
            key={`${cat}-${active}`}
            onPress={() => onChange(val)}
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
              // Bebas Neue's line-height metrics run much taller than its
              // cap-height, so lineHeight alone isn't enough — Android also
              // pads Text based on the font's internal ascent/descent
              // unless includeFontPadding is turned off.
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 14,
                lineHeight: 14,
                textTransform: "uppercase",
                includeFontPadding: false,
                textAlignVertical: "center",
                color: active ? "#121214" : tokens.textDim,
              }}
            >
              {cat}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
