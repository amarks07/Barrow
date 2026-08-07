import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { CATEGORIES } from "@barrow/core";
import { FONT_DISPLAY } from "../../theme/fonts";
import { CHIP_HEIGHT } from "../../theme/dimensions";
import { useTheme } from "../../theme/ThemeProvider";

// How close to the end (in px) counts as "there", so float rounding from
// the scroll events doesn't leave the indicator stuck on by a fraction of a
// pixel — same slop as the accent color picker's scroll indicator.
const SCROLL_END_SLOP = 4;

export function CategoryFilterChips({ value, onChange }) {
  const { tokens } = useTheme();
  const options = ["All", ...CATEGORIES];
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const hasMore = contentWidth - containerWidth - scrollX > SCROLL_END_SLOP;

  return (
    <View style={{ position: "relative" }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, paddingBottom: 12 }}
        scrollEventThrottle={16}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
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

      {hasMore && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", right: -4, top: 0, height: CHIP_HEIGHT, alignItems: "center", justifyContent: "center" }}
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
