import { useRef } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "../ui/Button";
import { useTheme } from "../../theme/ThemeProvider";

// Wraps expo-camera's CameraView for a one-shot QR scan: fires onScan once
// per mount with the decoded string, then ignores further frames — without
// this guard, onBarcodeScanned keeps firing for as long as the same code
// stays in frame. The parent remounts this (new key) to scan again.
export function QRScannerView({ onScan }) {
  const { tokens } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const firedRef = useRef(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
        <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center" }}>
          Barrow needs camera access to scan a routine's QR code.
        </Text>
        <Button
          label="Grant camera access"
          onPress={requestPermission}
          variant="solid"
          size="medium"
          style={{ alignSelf: "center" }}
        />
      </View>
    );
  }

  return (
    <CameraView
      style={{ flex: 1 }}
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={(result) => {
        if (firedRef.current) return;
        firedRef.current = true;
        onScan(result.data);
      }}
    />
  );
}
