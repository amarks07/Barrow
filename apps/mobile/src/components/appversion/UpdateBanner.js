import * as Linking from "expo-linking";
import { Pressable, Text } from "react-native";
import { Rocket } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { DOWNLOAD_URL } from "./UpdateAvailableModal";

// Persistent "an update is available" affordance at the top of the Profile
// hub (see ProfileView) — separate from UpdateAvailableModal's one-time
// on-open nag (useAppVersionCheck's visible/dismiss/dismissForever), and
// unaffected by it: dismissing or permanently silencing that modal for a
// version doesn't hide this, so there's always a way to grab the update
// from the profile screen for as long as one's actually available. A true
// full-bleed banner — edge to edge below the header, not inset inside the
// scroll content's own horizontal padding like a normal button would be
// (see ProfileView, which renders this as a sibling of the ScrollView
// rather than a child), same "spans the full width" treatment as
// PatchNotesModal/BiometricPromptModal's slide-down panels.
export function UpdateBanner({ latestVersion }) {
  const { tokens } = useTheme();
  if (!latestVersion) return null;

  return (
    <Pressable
      onPress={() => Linking.openURL(DOWNLOAD_URL).catch((e) => console.error("Barrow: failed to open " + DOWNLOAD_URL, e))}
      className="flex-row items-center justify-center gap-2 px-5"
      style={{
        minHeight: 64,
        backgroundColor: tokens.accent,
        borderBottomWidth: 1.5,
        borderBottomColor: "rgba(0,0,0,0.3)",
      }}
    >
      <Rocket size={18} color="#121214" />
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#121214" }}>{`Update available — v${latestVersion}`}</Text>
    </Pressable>
  );
}
