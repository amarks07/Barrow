import { useState } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { PremiumPlaceholderModal } from "./PremiumPlaceholderModal";

const PREMIUM_MODAL_COPY = {
  get: { title: "Get premium", message: "Premium upgrades aren't available yet — check back soon." },
  manage: { title: "Manage subscription", message: "Subscription management isn't available yet — check back soon." },
};

const STATUS_LABEL = {
  syncing: "Syncing…",
  synced: "Backed up",
  error: "Backup error",
};

// The profile screen is reachable whether or not the user is signed in (see
// ProfileScreen), so when there's no session this renders a sign-in prompt
// in place of the sync status/controls. The Face ID/fingerprint-unlock
// preference lives in Preferences instead — see PreferencesView — since
// it's a device setting, not backup state. Cloud sync itself is a premium
// entitlement (see useCloudSync) — a signed-in non-premium account gets a
// third state here instead of sync controls, since `premium` is set purely
// via billing/admin and there's no in-app upgrade flow yet.
export function CloudBackupSection({ cloudSync, profile, onSignIn }) {
  const { tokens } = useTheme();
  const { session, status, error, signOut, syncNow, syncLocked, unlockSync } = cloudSync;
  const [premiumModal, setPremiumModal] = useState(null); // null | "get" | "manage"

  if (!session) {
    return (
      <View className="mt-6 pt-6" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-3">
          Cloud backup
        </Text>
        <Text style={{ fontSize: 13, color: tokens.textDim }} className="mb-4">
          Sign in to keep your data backed up to the cloud
        </Text>
        <Button
          label="Sign in"
          onPress={onSignIn}
          size="medium"
          variant="solid"
          style={{ borderColor: "rgba(0,0,0,0.3)" }}
        />
      </View>
    );
  }

  if (!syncLocked && !profile.premium) {
    return (
      <>
        <View className="mt-6 pt-6" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-3">
            Cloud backup
          </Text>
          <Text style={{ fontSize: 13, color: tokens.text }} className="mb-1">
            Signed in as {session.user.email}
          </Text>
          <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-4">
            Get premium to backup your data.
          </Text>
          <View className="flex-row justify-between">
            <Button label="Sign out" onPress={signOut} />
            <Button
              label="Get premium"
              onPress={() => setPremiumModal("get")}
              variant="solid"
              size="medium"
              style={{ borderColor: "rgba(0,0,0,0.3)" }}
            />
          </View>
        </View>
        {premiumModal && <PremiumPlaceholderModal {...PREMIUM_MODAL_COPY[premiumModal]} onClose={() => setPremiumModal(null)} />}
      </>
    );
  }

  return (
    <>
      <View className="mt-6 pt-6" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-3">
          Cloud backup
        </Text>
        <Text style={{ fontSize: 13, color: tokens.text }} className="mb-1">
          Signed in as {session.user.email}
        </Text>
        {syncLocked ? (
          <>
            <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-4">
              Locked — authenticate to resume syncing
            </Text>
            <View className="flex-row justify-between">
              <Button label="Unlock to sync" onPress={unlockSync} />
              <Button label="Sign out" onPress={signOut} />
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 11, color: status === "error" ? tokens.danger : tokens.textDim }} className="mb-4">
              {status === "error" && error ? `Backup error: ${error}` : STATUS_LABEL[status] || "Idle"}
            </Text>
            <View className="flex-row justify-between">
              <Button label="Sync now" onPress={syncNow} disabled={status === "syncing"} />
              <Button label="Sign out" onPress={signOut} />
            </View>
          </>
        )}
        {profile.premium && (
          <Button
            label="Manage premium subscription"
            onPress={() => setPremiumModal("manage")}
            variant="solid"
            size="medium"
            fullWidth
            style={{ borderColor: "rgba(0,0,0,0.3)", marginTop: 10 }}
          />
        )}
      </View>
      {premiumModal && <PremiumPlaceholderModal {...PREMIUM_MODAL_COPY[premiumModal]} onClose={() => setPremiumModal(null)} />}
    </>
  );
}
