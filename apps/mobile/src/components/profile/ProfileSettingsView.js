import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { ProfileField } from "./ProfileField";
import { EditableAvatar } from "./EditableAvatar";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Account-identity half of the old single Profile screen (name, username,
// email, avatar) — as opposed to BiometricsView's physical stats. Profile
// ID and cloud backup stay on ProfileView's hub rather than living here.
// Reached from ProfileView's hub; `onBack` returns there. `cloudSync` is
// needed here (not just in ProfileView) because EditableAvatar's edit action
// requires a signed-in session — uploading goes through S3 via a Supabase
// Edge Function, see useProfilePicture.js.
export function ProfileSettingsView({ profile, onUpdate, onBack, cloudSync }) {
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
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Profile settings</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 + insets.bottom }}>
        <View className="items-center mb-6">
          <EditableAvatar profile={profile} onUpdate={onUpdate} cloudSync={cloudSync} />
        </View>

        <ProfileField label="First name" value={profile.firstName} onChange={(v) => onUpdate("firstName", v)} />
        <ProfileField label="Last name" value={profile.lastName} onChange={(v) => onUpdate("lastName", v)} />
        <ProfileField label="Username" value={profile.username} onChange={(v) => onUpdate("username", v)} />
        <ProfileField label="Email" keyboardType="email-address" value={profile.email} onChange={(v) => onUpdate("email", v)} />
      </ScrollView>
    </View>
  );
}
