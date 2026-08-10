import { useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { BUTTON_HEIGHT } from "../../theme/dimensions";
import { FONT_DISPLAY } from "../../theme/fonts";

const OPTIONS = [
  { value: "left", Icon: ArrowLeft, label: "Left arm" },
  { value: "both", Icon: ArrowLeftRight, label: "Both arms" },
  { value: "right", Icon: ArrowRight, label: "Right arm" },
];

const OPTION_HEIGHT = 40;
const MENU_WIDTH = 140;

// Collapsed icon button for which arm(s) a set was performed with. Opens a
// vertical dropdown of the three options directly below it, over a dimmed
// backdrop — rather than AngleToggle's always-visible inline segments —
// since this sits in the tight middle of a set's header row where three
// segments side by side would crowd the label/action buttons on either
// side. measureInWindow anchors the dropdown to the button's actual screen
// position since the Modal it renders into is a separate native root.
export function SideToggle({ value, onChange }) {
  const { tokens } = useTheme();
  const anchorRef = useRef(null);
  const [anchor, setAnchor] = useState(null);

  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[1];

  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  };

  const select = (optValue) => {
    onChange(optValue);
    setAnchor(null);
  };

  return (
    <>
      <Pressable
        ref={anchorRef}
        onPress={openMenu}
        accessibilityLabel={current.label}
        className="items-center justify-center"
        style={{
          width: BUTTON_HEIGHT.small,
          height: BUTTON_HEIGHT.small,
          borderRadius: 999,
          backgroundColor: tokens.surface,
          borderWidth: 1.5,
          borderColor: tokens.lineStrong,
        }}
      >
        <current.Icon size={14} color={tokens.textDim} />
      </Pressable>

      {anchor && (
        <Modal transparent animationType="none" visible onRequestClose={() => setAnchor(null)}>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
            onPress={() => setAnchor(null)}
          />
          <View
            style={{
              position: "absolute",
              top: anchor.y + anchor.height + 6,
              left: Math.max(8, anchor.x + anchor.width / 2 - MENU_WIDTH / 2),
              width: MENU_WIDTH,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: tokens.lineStrong,
              backgroundColor: tokens.bg,
              overflow: "hidden",
            }}
          >
            {OPTIONS.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => select(opt.value)}
                  className="flex-row items-center gap-2 px-3"
                  style={{
                    height: OPTION_HEIGHT,
                    backgroundColor: active ? tokens.accent : "transparent",
                  }}
                >
                  <opt.Icon size={14} color={active ? "#121214" : tokens.textDim} />
                  <Text
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 12,
                      textTransform: "uppercase",
                      includeFontPadding: false,
                      color: active ? "#121214" : tokens.text,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Modal>
      )}
    </>
  );
}
