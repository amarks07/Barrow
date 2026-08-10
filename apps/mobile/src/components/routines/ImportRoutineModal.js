import { useMemo, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { parseRoutineShare, resolveRoutineShare } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { ColorSwitch } from "../ui/ColorSwitch";
import { Card } from "../ui/Card";
import { QRScannerView } from "./QRScannerView";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

const SOURCE_OPTIONS = [
  { value: "scan", label: "Scan" },
  { value: "file", label: "File" },
];

// Full-screen modal opened from RoutinesView, mirroring ExercisePicker's
// treatment. Two steps: pick a source (camera scan or a file someone sent)
// to get a raw payload, then review what it'll add before anything is
// actually written to exercises/routines — resolveRoutineShare (from
// @barrow/core) is pure, so the review step is free to recompute as often
// as it likes without side effects.
export function ImportRoutineModal({ exercises, onImport, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState("scan");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [scanAttempt, setScanAttempt] = useState(0);

  const resolved = useMemo(() => (data ? resolveRoutineShare(data, exercises) : null), [data, exercises]);

  const handlePayload = (raw) => {
    try {
      setData(parseRoutineShare(raw));
      setError("");
    } catch (e) {
      setError(e.message);
      setScanAttempt((n) => n + 1);
    }
  };

  const pickFile = async () => {
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"] });
      if (result.canceled) return;
      const file = new File(result.assets[0].uri);
      handlePayload(await file.text());
    } catch (e) {
      setError(e.message || "Couldn't read that file.");
    }
  };

  const backToChoose = () => {
    setData(null);
    setError("");
  };

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        <View className="flex-row items-center gap-3 px-5 pb-4" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
          <IconBtn label="Close" onPress={onClose}>
            <X size={17} color={tokens.text} />
          </IconBtn>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text, flex: 1 }} numberOfLines={1}>
            {resolved ? `Import "${resolved.name}"` : "Import routine"}
          </Text>
          {!resolved && <ColorSwitch value={source} options={SOURCE_OPTIONS} onChange={setSource} />}
        </View>

        {resolved ? (
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 + insets.bottom }}>
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
              Exercises
            </Text>
            <View style={{ gap: 8 }} className="mb-4">
              {resolved.exerciseIds.map((id, i) => {
                const newEx = resolved.newExercises.find((e) => e.id === id);
                const ex = newEx || exercises.find((e) => e.id === id);
                return (
                  <Card key={`${id}-${i}`} style={{ padding: 12 }}>
                    <View className="flex-row items-center justify-between">
                      <Text style={{ fontSize: 13, color: tokens.text }}>{ex?.name}</Text>
                      {newEx && <Text style={{ fontSize: 10, color: tokens.accent, fontWeight: "600" }}>NEW</Text>}
                    </View>
                  </Card>
                );
              })}
            </View>
            {resolved.newExercises.length > 0 && (
              <Text style={{ fontSize: 11, color: tokens.textDim, lineHeight: 16 }} className="mb-6">
                {resolved.newExercises.length} new exercise{resolved.newExercises.length === 1 ? "" : "s"} will be added to your
                exercise list along with this routine.
              </Text>
            )}
            <View className="flex-row gap-3">
              <Button label="Back" onPress={backToChoose} size="medium" />
              <Button label="Add routine" onPress={() => onImport(resolved)} variant="solid" size="medium" />
            </View>
          </ScrollView>
        ) : (
          <>
            {source === "scan" ? (
              <QRScannerView key={scanAttempt} onScan={handlePayload} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
                <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center" }}>
                  Choose a routine file a friend sent you.
                </Text>
                <Button
                  label="Choose file…"
                  onPress={pickFile}
                  variant="solid"
                  size="medium"
                  style={{ alignSelf: "center" }}
                />
              </View>
            )}
            {error ? (
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 12, color: tokens.danger, textAlign: "center" }}>{error}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </Modal>
  );
}
