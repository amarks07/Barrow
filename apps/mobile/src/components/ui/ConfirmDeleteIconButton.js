import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { Trash2 } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { BUTTON_HEIGHT } from "../../theme/dimensions";
import { FONT_DISPLAY } from "../../theme/fonts";

// Compact icon-only variant of ConfirmDeleteButton, for tight spots (like
// an exercise grid tile) where a text label wouldn't fit at rest. Once
// armed it swaps the icon for a small "Delete?" pill.
//
// standardSize pins the tap target to Button's "small" height, for spots
// (like the DayView header) where this sits alongside real Buttons and
// needs to read as the same size rather than shrink-to-fit the icon.
export function ConfirmDeleteIconButton({ onConfirm, size = 12, className = "", label, standardSize = false }) {
  const { tokens } = useTheme();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <Pressable
      // Keyed on confirming: a stable style object (borderRadius always
      // present) still wasn't enough — see Button.js for why the key needs
      // to change too.
      key={String(confirming)}
      onPress={() => {
        if (confirming) {
          setConfirming(false);
          onConfirm();
        } else {
          setConfirming(true);
        }
      }}
      accessibilityLabel={confirming ? "Confirm delete" : label}
      hitSlop={8}
      className={`items-center justify-center ${className}`}
      style={{
        ...(standardSize && !confirming ? { width: BUTTON_HEIGHT.small, height: BUTTON_HEIGHT.small } : {}),
        borderRadius: 999,
        backgroundColor: confirming ? tokens.danger : "transparent",
        paddingHorizontal: confirming ? (standardSize ? BUTTON_HEIGHT.small / 3 : 8) : 0,
        paddingVertical: confirming ? (standardSize ? 0 : 2) : 0,
        height: confirming && standardSize ? BUTTON_HEIGHT.small : undefined,
      }}
    >
      {confirming ? (
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: standardSize ? 12 : 10,
            lineHeight: standardSize ? 12 : 10,
            textTransform: "uppercase",
            includeFontPadding: false,
            textAlignVertical: "center",
            color: "#FFFFFF",
          }}
        >
          Delete?
        </Text>
      ) : (
        <Trash2 size={size} color={tokens.textDim} />
      )}
    </Pressable>
  );
}
