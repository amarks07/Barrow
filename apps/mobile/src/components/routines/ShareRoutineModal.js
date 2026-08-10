import { useMemo, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { buildRoutineShare, slug } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Past this many characters a QR code renders too fine-grained to reliably
// scan on a phone camera — only the file-share button is offered instead.
const QR_CHAR_LIMIT = 2000;

// Full-screen modal opened from RoutineDetailView's header, matching
// ExercisePicker's fullScreen-modal treatment. Both the QR code and the
// shared file are built from the same buildRoutineShare() JSON so there's
// one source of truth per share.
export function ShareRoutineModal({ routine, exercises, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);

  const json = useMemo(() => JSON.stringify(buildRoutineShare(routine, exercises)), [routine, exercises]);
  const tooBigForQr = json.length > QR_CHAR_LIMIT;

  const shareFile = async () => {
    setError("");
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setError("Sharing isn't available on this device.");
        return;
      }
      const fileName = `${slug(routine.name) || "routine"}.json`;
      const file = new File(Paths.cache, fileName);
      file.create({ overwrite: true });
      file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: `Share "${routine.name}"` });
    } catch (e) {
      setError(e.message || "Couldn't share that file.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        <View
          className="flex-row items-center gap-3 px-5 pb-4"
          style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
        >
          <IconBtn label="Close" onPress={onClose}>
            <X size={17} color={tokens.text} />
          </IconBtn>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text, flex: 1 }} numberOfLines={1}>
            Share "{routine.name}"
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 + insets.bottom, alignItems: "center", gap: 20 }}>
          <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center", lineHeight: 18 }}>
            Let a friend scan this with Barrow's "Import" screen, or send them the file directly.
          </Text>

          {tooBigForQr ? (
            <Text style={{ fontSize: 12, color: tokens.textDim, textAlign: "center" }} className="my-6">
              This routine has too many exercises to fit a scannable QR code — share it as a file instead.
            </Text>
          ) : (
            // Always rendered dark-on-white regardless of theme — QR
            // scanners are tuned for that contrast, unlike the rest of the
            // app's themed surfaces.
            <View style={{ backgroundColor: "#FFFFFF", padding: 20, borderRadius: 10 }}>
              <QRCode value={json} size={220} backgroundColor="#FFFFFF" color="#121214" />
            </View>
          )}

          <Button label={sharing ? "…" : "Share as file"} onPress={shareFile} disabled={sharing} variant="solid" size="medium" fullWidth />

          {error ? <Text style={{ fontSize: 12, color: tokens.danger, textAlign: "center" }}>{error}</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
