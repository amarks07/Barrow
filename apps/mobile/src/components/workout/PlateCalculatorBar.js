import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { calcPlateBreakdown } from "@barrow/core";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Taller than a typical toolbar so the plate stacks below have room to
// read as a barbell rather than a row of cramped chips.
const BAR_MIN_HEIGHT = 96;
// [light, standard] fixed-bar weight per unit — a 45lb/20kg standard bar
// and the lighter alternative gyms commonly rack alongside it.
const BAR_WEIGHT_OPTIONS = { lb: [25, 45], kg: [10, 20] };

// A plate's chip height scales with its size relative to the heaviest
// plate in the set, so the row reads like a real stack — heavier plates
// visibly taller, mirroring the bigger diameter they'd have on the bar.
function chipHeight(size, maxSize) {
  return 26 + (size / maxSize) * 30;
}

// One chip per plate size on this side, with an "×N" badge inside it when
// more than one of that size is needed — rather than repeating the chip N
// times, which got unreadable fast for anything past a couple of plates.
function PlateChip({ size, count, maxSize }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        width: 30,
        height: chipHeight(size, maxSize),
        borderRadius: 6,
        backgroundColor: tokens.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 12,
          includeFontPadding: false,
          textAlignVertical: "center",
          color: tokens.onAccent,
        }}
      >
        {size}
      </Text>
      {count > 1 && (
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 15,
            includeFontPadding: false,
            textAlignVertical: "center",
            color: tokens.onAccent,
          }}
        >
          ×{count}
        </Text>
      )}
    </View>
  );
}

// The plate-loading calculator: given a weight being typed and a unit, shows
// how to load each side of the bar to hit it — a centered bar-weight toggle
// with plate stacks mirrored outward on either side (heaviest nearest the
// bar, like a real loaded barbell). Rendered by WeightToolbar above its chip
// row when the "Plate Calculator" chip is active; WeightEditModal is what
// puts that whole toolbar above the keyboard — see that component for why.
export function PlateCalculatorBar({ value, unit }) {
  const { tokens } = useTheme();
  // Session-only choice, not persisted — stored as light(0)/standard(1)
  // rather than a raw weight so it survives a kg/lb preference switch
  // instead of carrying, say, a stale "45" over into kg options.
  const [barWeightIndex, setBarWeightIndex] = useState(1);

  const barOptions = BAR_WEIGHT_OPTIONS[unit] ?? BAR_WEIGHT_OPTIONS.lb;
  const barWeight = barOptions[barWeightIndex];
  const target = parseFloat(value) || 0;
  const breakdown = calcPlateBreakdown(target, unit, barWeight);
  const maxSize = unit === "kg" ? 25 : 45;

  // breakdown.plates is heaviest-first. Left side reads outer-edge → center
  // as light → heavy (ascending); right side, anchored to the right edge,
  // keeps the heaviest-first order so its first (leftmost-within-the-group)
  // plate lands nearest the bar and the lightest ends up at the outer edge
  // — the two sides end up as mirror images, like a real loaded bar.
  const leftPlates = [...breakdown.plates].reverse();
  const rightPlates = breakdown.plates;

  let statusText = null;
  if (target <= 0) {
    statusText = "Enter a weight to see the plate breakdown";
  } else if (target < breakdown.barWeight) {
    statusText = `Below the ${breakdown.barWeight}${unit} bar`;
  } else if (breakdown.plates.length === 0) {
    statusText = "Bar only — no plates";
  } else {
    statusText = `${breakdown.perSide}${unit} per side`;
  }

  return (
    <View
      style={{
        minHeight: BAR_MIN_HEIGHT,
        paddingVertical: 12,
        backgroundColor: tokens.header,
        borderTopWidth: 1.5,
        borderTopColor: tokens.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 10 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-start", gap: 4 }}>
          {leftPlates.map(({ size, count }) => (
            <PlateChip key={size} size={size} count={count} maxSize={maxSize} />
          ))}
        </View>

        <View style={{ alignItems: "center", marginHorizontal: 10 }}>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 10, color: tokens.textDim, marginBottom: 3 }}>BAR</Text>
          {/* Per-option Pressable, each selecting its own index directly
              (not a track-wide toggle that just flips) — otherwise tapping
              the already-active pill would flip it away instead of being a
              no-op.

              onPressIn, not onPress: on iOS (no `focusable` prop to lean on
              like the Android fix below) this tap still blurs the sheet's
              autoFocused Counter input, which reflows the sheet out from
              under the finger before touch-up and would otherwise make
              Pressable treat the gesture as cancelled — onPress only firing
              on a second tap.

              Keyed on isActive too, not just w: see Button.js — Android can
              drop the rounded-corner drawable when only backgroundColor is
              patched on an already-mounted view, rendering it square for a
              frame. Changing the key forces a remount instead of a patch. */}
          <View
            className="flex-row items-center rounded-full"
            style={{ padding: 2, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
          >
            {barOptions.map((w, i) => {
              const isActive = barWeightIndex === i;
              return (
                <Pressable
                  key={`${w}-${isActive}`}
                  onPressIn={() => setBarWeightIndex(i)}
                  focusable={false}
                  accessibilityLabel={`${w} bar`}
                  accessibilityState={{ selected: isActive }}
                  className="items-center justify-center"
                  style={{
                    height: 26,
                    paddingHorizontal: 9,
                    borderRadius: 999,
                    backgroundColor: isActive ? tokens.accent : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 12,
                      includeFontPadding: false,
                      textAlignVertical: "center",
                      color: isActive ? tokens.onAccent : tokens.textDim,
                    }}
                  >
                    {w}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-end", gap: 4 }}>
          {rightPlates.map(({ size, count }) => (
            <PlateChip key={size} size={size} count={count} maxSize={maxSize} />
          ))}
        </View>
      </View>

      <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 12, color: tokens.textDim, textAlign: "center", marginTop: 8 }}>
        {statusText}
        {breakdown.remainder > 0 && <Text style={{ color: tokens.danger }}> · +{breakdown.remainder}{unit} short</Text>}
      </Text>
    </View>
  );
}
