import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { PATCH_NOTES } from "../../content/patchNotes";

// Full history of PATCH_NOTES entries, newest first — reachable any time
// from the "Patch notes" row at the bottom of Preferences. Distinct from
// PatchNotesModal, which only ever shows the single entry for the version
// just installed, once, right after an update (see usePatchNotes).
export function PatchNotesView({ onBack }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <View
        className="flex-row items-center gap-3 px-5 pb-4"
        style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
      >
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Patch notes</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 + insets.bottom }}>
        {PATCH_NOTES.map((entry, i) => (
          <View key={entry.version} className={i === PATCH_NOTES.length - 1 ? "" : "mb-7"}>
            <View className="flex-row items-baseline justify-between mb-2">
              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: tokens.text }}>{entry.title}</Text>
              <Text style={{ fontSize: 12, color: tokens.textDim }}>v{entry.version}</Text>
            </View>
            <View style={{ gap: 6 }}>
              {entry.notes.map((note, j) => (
                <View key={j} className="flex-row" style={{ gap: 8 }}>
                  <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>•</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>{note}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
