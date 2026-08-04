import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, User } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { ProfileField } from "./ProfileField";
import { CloudBackupSection } from "./CloudBackupSection";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function ProfileView({ profile, onUpdate, onClose, cloudSync }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <View
        className="flex-row items-center gap-3 px-5 pb-4"
        style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
      >
        <IconBtn label="Close" onPress={onClose}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Profile</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 + insets.bottom }}>
        <View className="items-center mb-6">
          <View
            className="items-center justify-center overflow-hidden"
            style={{ width: 84, height: 84, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
          >
            {profile.pictureUrl ? (
              <Image source={{ uri: profile.pictureUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : initials ? (
              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: tokens.textDim }}>{initials}</Text>
            ) : (
              <User size={32} color={tokens.textDim} />
            )}
          </View>
        </View>

        <ProfileField label="Profile picture URL" value={profile.pictureUrl} onChange={(v) => onUpdate("pictureUrl", v)} placeholder="https://…" />
        <ProfileField label="First name" value={profile.firstName} onChange={(v) => onUpdate("firstName", v)} />
        <ProfileField label="Last name" value={profile.lastName} onChange={(v) => onUpdate("lastName", v)} />
        <ProfileField label="Username" value={profile.username} onChange={(v) => onUpdate("username", v)} />
        <ProfileField label="Email" keyboardType="email-address" value={profile.email} onChange={(v) => onUpdate("email", v)} />

        <View className="mt-2">
          <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-1">
            Profile ID
          </Text>
          <Text style={{ fontSize: 14, color: tokens.textDim, fontVariant: ["tabular-nums"] }}>{profile.profileId}</Text>
        </View>

        <CloudBackupSection cloudSync={cloudSync} />
      </ScrollView>
    </View>
  );
}
