import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { BUTTON_FONT_SIZE, BUTTON_HEIGHT, BUTTON_PADDING_H } from "../../theme/dimensions";
import { FONT_DISPLAY } from "../../theme/fonts";

// Two-step delete: first tap arms it (red, "Delete?"), second tap actually
// deletes. Auto-disarms after 3s if you don't confirm. `size` mirrors
// Button's — defaults to "small" to match History/Swap/etc. in a row, but
// callers stacking this alongside Button's "medium" (e.g.
// ExerciseActionsMenu) can match that height instead.
export function ConfirmDeleteButton({ onConfirm, label = "Delete", confirmLabel = "Delete?", size = "small" }) {
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
      style={{
        height: BUTTON_HEIGHT[size],
        paddingHorizontal: BUTTON_PADDING_H[size],
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        borderWidth: 1.5,
        backgroundColor: confirming ? tokens.danger : tokens.surface,
        borderColor: confirming ? tokens.danger : tokens.lineStrong,
      }}
    >
      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: BUTTON_FONT_SIZE[size],
          lineHeight: BUTTON_FONT_SIZE[size],
          textTransform: "uppercase",
          includeFontPadding: false,
          textAlignVertical: "center",
          color: confirming ? "#FFFFFF" : tokens.textDim,
        }}
      >
        {confirming ? confirmLabel : label}
      </Text>
    </Pressable>
  );
}
