import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { IconBtn } from "./IconBtn";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// A small floating card, centered over a dimmed backdrop — for content that
// doesn't need a full screen (a QR code, currently its only use) but also
// isn't a top-anchored alert like ConfirmActionModal/ErrorModal. The
// backdrop Pressable fills the screen and closes on tap; the `box-none`
// wrapper around the card lets touches outside the card's own bounds fall
// through to that backdrop, while touches on the card itself land on the
// card (same layering trick ConfirmActionModal's backdrop uses, just with a
// centered card instead of full-width content).
export function FloatingCardModal({ title, onClose, children }) {
  const { tokens } = useTheme();

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
      />
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View
          style={{
            width: "100%",
            maxWidth: 340,
            maxHeight: "85%",
            backgroundColor: tokens.bg,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: tokens.line,
            padding: 20,
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text, flex: 1 }} numberOfLines={1}>
              {title}
            </Text>
            <IconBtn label="Close" onPress={onClose}>
              <X size={17} color={tokens.text} />
            </IconBtn>
          </View>
          <ScrollView contentContainerStyle={{ alignItems: "center", gap: 16 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
