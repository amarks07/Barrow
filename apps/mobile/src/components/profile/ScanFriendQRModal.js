import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleCheck, X } from "lucide-react-native";
import { parseFriendShare, logError } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { QRScannerView } from "../routines/QRScannerView";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Full-screen modal opened from FriendsView — scans a code built by
// ShareFriendQRModal and adds the pair as friends immediately (no accept
// step, unlike a search-based request; see add_friend_by_public_id in
// supabase/schema.sql). `scanAttempt` remounts QRScannerView (fresh `key`)
// so an error can be retried, same pattern as ImportRoutineModal.
//
// `initialData` (already-parsed, from parseFriendShare) skips straight to
// adding without a camera step at all — used when a barrow://friend link
// was opened directly (e.g. scanned by the phone's own camera app rather
// than this in-app scanner) via useShareDeepLink.
export function ScanFriendQRModal({ addByPublicId, initialData, onClose }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState(initialData ? "adding" : "scanning"); // scanning | adding | error | added
  const [error, setError] = useState("");
  const [added, setAdded] = useState(null);
  const [scanAttempt, setScanAttempt] = useState(0);

  const addFriend = async (parsed) => {
    setStatus("adding");
    try {
      const friend = await addByPublicId(parsed.id);
      setAdded(friend);
      setStatus("added");
    } catch (e) {
      setError(e.message || "Couldn't add that friend.");
      setStatus("error");
      setScanAttempt((n) => n + 1);
    }
  };

  useEffect(() => {
    if (initialData) addFriend(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = async (raw) => {
    let parsed;
    try {
      parsed = parseFriendShare(raw);
    } catch (e) {
      logError("friends.scan.parse", e);
      setError(e.message);
      setStatus("error");
      setScanAttempt((n) => n + 1);
      return;
    }
    addFriend(parsed);
  };

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        <View className="flex-row items-center gap-3 px-5 pb-4" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
          <IconBtn label="Close" onPress={onClose}>
            <X size={17} color={tokens.text} />
          </IconBtn>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Scan a QR code</Text>
        </View>

        {status === "added" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
            <CircleCheck size={40} color={tokens.accent} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: tokens.text, textAlign: "center" }}>
              Added {added?.username || `${added?.firstName || ""} ${added?.lastName || ""}`.trim() || "friend"}!
            </Text>
            <Button label="Done" onPress={onClose} variant="solid" size="medium" style={{ alignSelf: "center" }} />
          </View>
        ) : status === "adding" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={tokens.text} />
          </View>
        ) : (
          <>
            <QRScannerView key={scanAttempt} onScan={handleScan} />
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
