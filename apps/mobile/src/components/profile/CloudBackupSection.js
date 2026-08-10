import { useState } from "react";
import { Text, View } from "react-native";
import { Cloud } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { PremiumPlaceholderModal } from "./PremiumPlaceholderModal";

const PREMIUM_MODAL_COPY = {
  get: { title: "Get premium", message: "Premium upgrades aren't available yet — check back soon." },
};

const STATUS_LABEL = {
  syncing: "Syncing…",
  synced: "Backed up",
  error: "Backup error",
};

// The profile screen is reachable whether or not the user is signed in (see
// ProfileScreen), so when there's no session this renders a teaser card
// with the sign-in/sign-up CTA in place of sync status/controls. Signed-in
// identity (email + sign out) lives in AccountSection above this instead —
// every branch below only deals with backup/sync/premium. The Face
// ID/fingerprint-unlock preference lives in Preferences instead — see
// PreferencesView — since it's a device setting, not backup state. Cloud
// sync itself is a premium entitlement (see useCloudSync) — a signed-in
// non-premium account gets a third state here instead of sync controls,
// since `premium` is set purely via billing/admin and there's no in-app
// upgrade flow yet.
export function CloudBackupSection({ cloudSync, profile, onSignIn }) {
  const { tokens } = useTheme();
  const { session, status, error, syncNow, syncLocked, unlockSync } = cloudSync;
  const [premiumModal, setPremiumModal] = useState(null); // null | "get"

  if (!session) {
    return (
      <Card className="mt-6" style={{ padding: 14 }}>
        <View className="flex-row gap-3 items-start mb-4">
          <Cloud size={18} color={tokens.accent} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: tokens.textDim, lineHeight: 17 }}>
            Sign in to back up your data to the cloud and connect with friends.
          </Text>
        </View>
        <Button label="Sign in/up" onPress={onSignIn} size="medium" variant="solid" style={{ borderColor: "rgba(0,0,0,0.3)" }} />
      </Card>
    );
  }

  if (!syncLocked && !profile.premium) {
    return (
      <>
        <View className="mt-6 pt-6 flex-row items-center justify-between" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
          <View style={{ flex: 1 }} className="pr-3">
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-1">
              Cloud backup
            </Text>
            <Text style={{ fontSize: 11, color: tokens.textDim }}>Get premium to backup your data.</Text>
          </View>
          <Button
            label="Get premium"
            onPress={() => setPremiumModal("get")}
            variant="solid"
            size="medium"
            style={{ borderColor: "rgba(0,0,0,0.3)" }}
          />
        </View>
        {premiumModal && <PremiumPlaceholderModal {...PREMIUM_MODAL_COPY[premiumModal]} onClose={() => setPremiumModal(null)} />}
      </>
    );
  }

  return (
    <View className="mt-6 pt-6 flex-row items-center justify-between" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
      <View style={{ flex: 1 }} className="pr-3">
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-1">
          Cloud backup
        </Text>
        <Text style={{ fontSize: 11, color: syncLocked ? tokens.textDim : status === "error" ? tokens.danger : tokens.textDim }}>
          {syncLocked
            ? "Locked — authenticate to resume syncing"
            : status === "error" && error
              ? `Backup error: ${error}`
              : STATUS_LABEL[status] || "Idle"}
        </Text>
      </View>
      {syncLocked ? (
        <Button label="Unlock to sync" onPress={unlockSync} />
      ) : (
        <Button label="Sync now" onPress={syncNow} disabled={status === "syncing"} />
      )}
    </View>
  );
}
