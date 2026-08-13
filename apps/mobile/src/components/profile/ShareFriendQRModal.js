import { useMemo } from "react";
import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { buildFriendShare } from "@barrow/core";
import { FloatingCardModal } from "../ui/FloatingCardModal";
import { useMaxBrightness } from "../../hooks/useMaxBrightness";
import { useTheme } from "../../theme/ThemeProvider";

// Floating card opened from FriendsView — a friend code payload is tiny
// (just the Profile ID), so unlike routines there's no "too big to
// scan"/file-share fallback needed.
export function ShareFriendQRModal({ publicId, onClose }) {
  const { tokens } = useTheme();
  const json = useMemo(() => JSON.stringify(buildFriendShare(publicId)), [publicId]);
  useMaxBrightness();

  return (
    <FloatingCardModal title="My QR code" onClose={onClose}>
      <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center", lineHeight: 18 }}>
        Let a friend scan this with Barrow's "Scan a QR code" button to add each other instantly.
      </Text>

      {/* Always rendered dark-on-white regardless of theme — QR scanners are
          tuned for that contrast, unlike the rest of the app's themed surfaces. */}
      <View style={{ backgroundColor: "#FFFFFF", padding: 20, borderRadius: 10 }}>
        <QRCode value={json} size={200} backgroundColor="#FFFFFF" color="#121214" />
      </View>

      <Text style={{ fontSize: 14, color: tokens.textDim, fontVariant: ["tabular-nums"] }}>{publicId}</Text>
    </FloatingCardModal>
  );
}
