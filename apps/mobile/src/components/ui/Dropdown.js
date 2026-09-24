import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronDown, X } from "lucide-react-native";
import { IconBtn } from "./IconBtn";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// A compact chip that opens a bottom-sheet list of options — the pattern for
// switching what a chart plots once there are more choices than a ColorSwitch
// segmented control comfortably fits.
export function Dropdown({ value, options, onChange, title = "Select" }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={title}
        className="flex-row items-center self-start gap-1.5 px-3 py-1.5 rounded-full"
        style={{ backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: tokens.text }}>{current?.label}</Text>
        <ChevronDown size={14} color={tokens.textDim} />
      </Pressable>

      <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" }}
        >
          <Pressable
            // Swallow taps on the sheet itself so they don't bubble to the
            // backdrop Pressable and close the sheet mid-selection.
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: tokens.bg,
              borderTopWidth: 1.5,
              borderTopColor: tokens.line,
              paddingBottom: Math.max(16, insets.bottom),
            }}
          >
            <View
              className="flex-row items-center gap-3 px-5 pb-4 pt-4"
              style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
            >
              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: tokens.text, flex: 1 }}>{title}</Text>
              <IconBtn label="Close" onPress={() => setOpen(false)}>
                <X size={17} color={tokens.text} />
              </IconBtn>
            </View>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  className="flex-row items-center justify-between px-5 py-3.5"
                >
                  <Text style={{ fontSize: 15, color: tokens.text }}>{opt.label}</Text>
                  {active && <Check size={16} color={tokens.accent} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
