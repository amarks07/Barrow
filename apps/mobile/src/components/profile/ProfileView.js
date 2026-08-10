import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "../ui/Button";
import { IconBtn } from "../ui/IconBtn";
import { MenuRow } from "../ui/MenuRow";
import { ProfileSettingsView } from "./ProfileSettingsView";
import { BiometricsView } from "./BiometricsView";
import { AccountSection } from "./AccountSection";
import { CloudBackupSection } from "./CloudBackupSection";
import { DangerZoneSection } from "./DangerZoneSection";
import { PremiumPlaceholderModal } from "./PremiumPlaceholderModal";
import { SignInModal } from "./SignInModal";
import { EditableAvatar } from "./EditableAvatar";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Entry point for the profile flow: a small hub linking out to the two
// pages the old single scrolling Profile screen was split into — account
// identity (ProfileSettingsView) and physical stats (BiometricsView) — plus
// Profile ID and cloud backup, which stay here rather than moving into
// either sub-page. Each sub-page's own back button returns here; `onClose`
// (this hub's back button) is what exits the whole flow. Reachable whether
// or not the user is signed in — CloudBackupSection's own signed-out state
// carries the "Sign in/up" CTA in place of sync status, and opens
// SignInModal (below) on tap.
export function ProfileView({ profile, onUpdate, onClose, cloudSync, onClearWorkoutData }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState("hub"); // "hub" | "settings" | "biometrics"
  const [showSignIn, setShowSignIn] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  // A successful sign-in closes the modal on its own rather than waiting
  // for the user to dismiss it — same as the old MainStack flow this
  // replaced (see MainStack's onOpenProfile).
  useEffect(() => {
    if (cloudSync.session) setShowSignIn(false);
  }, [cloudSync.session]);

  if (page === "settings") {
    return <ProfileSettingsView profile={profile} onUpdate={onUpdate} onBack={() => setPage("hub")} cloudSync={cloudSync} />;
  }
  if (page === "biometrics") {
    return <BiometricsView profile={profile} onUpdate={onUpdate} onBack={() => setPage("hub")} />;
  }

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
          <EditableAvatar profile={profile} onUpdate={onUpdate} cloudSync={cloudSync} />
          {(profile.username || profile.firstName || profile.lastName) && (
            <Text style={{ fontSize: 16, fontWeight: "600", color: tokens.text, marginTop: 10 }}>
              {profile.username || `${profile.firstName} ${profile.lastName}`}
            </Text>
          )}
        </View>

        <View style={{ gap: 10 }}>
          {/* Name/username/email live on the cloud profile row (see schema.sql),
              which only exists once signed in — nothing to edit without a session. */}
          {cloudSync.session && (
            <MenuRow label="Profile settings" subtitle="Name, username, email" onPress={() => setPage("settings")} />
          )}
          <MenuRow label="Biometrics" subtitle="Birthday, gender, height, weight" onPress={() => setPage("biometrics")} />
        </View>

        <AccountSection cloudSync={cloudSync} profile={profile} />

        <CloudBackupSection cloudSync={cloudSync} profile={profile} onSignIn={() => setShowSignIn(true)} />

        {cloudSync.session && (
          <View className="mt-6 pt-6" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
            <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-1">
              Profile ID
            </Text>
            <Text style={{ fontSize: 14, color: tokens.textDim, fontVariant: ["tabular-nums"] }}>{profile.profileId}</Text>
          </View>
        )}

        {cloudSync.session && profile.premium && (
          <View className="mt-6 pt-6" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
            <Button
              label="Manage premium subscription"
              onPress={() => setShowManageModal(true)}
              variant="solid"
              size="medium"
              fullWidth
              style={{ borderColor: "rgba(0,0,0,0.3)" }}
            />
          </View>
        )}

        <DangerZoneSection onClearWorkoutData={onClearWorkoutData} cloudSync={cloudSync} profile={profile} onAccountDeleted={onClose} />
      </ScrollView>

      {showSignIn && <SignInModal cloudSync={cloudSync} onClose={() => setShowSignIn(false)} />}
      {showManageModal && (
        <PremiumPlaceholderModal
          title="Manage subscription"
          message="Subscription management isn't available yet — check back soon."
          onClose={() => setShowManageModal(false)}
        />
      )}
    </View>
  );
}
