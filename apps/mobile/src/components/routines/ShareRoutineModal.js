import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { buildRoutineShare, slug, logError } from "@barrow/core";
import { Button } from "../ui/Button";
import { FloatingCardModal } from "../ui/FloatingCardModal";
import { useMaxBrightness } from "../../hooks/useMaxBrightness";
import { useTheme } from "../../theme/ThemeProvider";

// Past this many characters a QR code renders too fine-grained to reliably
// scan on a phone camera — only the file-share button is offered instead.
const QR_CHAR_LIMIT = 2000;

// Floating card opened from RoutineDetailView's header. Both the QR code
// and the shared file are built from the same buildRoutineShare() JSON so
// there's one source of truth per share.
export function ShareRoutineModal({ routine, exercises, onClose }) {
  const { tokens } = useTheme();
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);

  const json = useMemo(() => JSON.stringify(buildRoutineShare(routine, exercises)), [routine, exercises]);
  const tooBigForQr = json.length > QR_CHAR_LIMIT;
  useMaxBrightness(!tooBigForQr);

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
      logError("routines.share.file", e);
      setError("Couldn't share that file. Try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <FloatingCardModal title={`Share "${routine.name}"`} onClose={onClose}>
      <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center", lineHeight: 18 }}>
        Let a friend scan this with Barrow's "Import" screen, or send them the file directly.
      </Text>

      {tooBigForQr ? (
        <Text style={{ fontSize: 12, color: tokens.textDim, textAlign: "center" }} className="my-6">
          This routine has too many exercises to fit a scannable QR code — share it as a file instead.
        </Text>
      ) : (
        // Always rendered dark-on-white regardless of theme — QR scanners
        // are tuned for that contrast, unlike the rest of the app's themed
        // surfaces.
        <View style={{ backgroundColor: "#FFFFFF", padding: 20, borderRadius: 10 }}>
          <QRCode value={json} size={200} backgroundColor="#FFFFFF" color="#121214" />
        </View>
      )}

      <Button label={sharing ? "…" : "Share as file"} onPress={shareFile} disabled={sharing} variant="solid" size="medium" fullWidth />

      {error ? <Text style={{ fontSize: 12, color: tokens.danger, textAlign: "center" }}>{error}</Text> : null}
    </FloatingCardModal>
  );
}
