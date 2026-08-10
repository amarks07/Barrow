import { useState } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";
import { Button } from "../ui/Button";
import { ConfirmActionModal } from "../ui/ConfirmActionModal";

// Bottom-of-hub section for irreversible data actions, kept separate from
// (and below) CloudBackupSection since these aren't backup controls
// themselves. "Clear backup data" only makes sense with something on the
// cloud row to clear — shown for a premium account (sync is always live for
// those) or a non-premium account that still has a stale backup left over
// from before a downgrade (hasBackupData), and hidden entirely rather than
// shown disabled otherwise, matching how CloudBackupSection swaps in a
// sign-in CTA instead of disabled sync controls when signed out. "Delete
// account" only needs a session to exist at all.
export function DangerZoneSection({ onClearWorkoutData, cloudSync, profile }) {
  const { tokens } = useTheme();
  const [confirming, setConfirming] = useState(null); // null | "workouts" | "backup" | "delete-account"
  const { session, clearBackupData, hasBackupData, deleteAccount } = cloudSync;

  return (
    <>
      <View className="mt-6 pt-6" style={{ borderTopWidth: 1.5, borderTopColor: tokens.line }}>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.danger }} className="mb-3">
          Danger zone
        </Text>
        <View style={{ gap: 10 }}>
          <Button
            label="Clear workout data"
            onPress={() => setConfirming("workouts")}
            fullWidth
            size="medium"
            style={{ borderColor: tokens.danger }}
            textStyle={{ color: tokens.danger }}
          />
          {session && (profile.premium || hasBackupData) && (
            <Button
              label="Clear backup data"
              onPress={() => setConfirming("backup")}
              fullWidth
              size="medium"
              style={{ borderColor: tokens.danger }}
              textStyle={{ color: tokens.danger }}
            />
          )}
          {session && (
            <Button
              label="Delete account"
              onPress={() => setConfirming("delete-account")}
              fullWidth
              size="medium"
              style={{ borderColor: tokens.danger }}
              textStyle={{ color: tokens.danger }}
            />
          )}
        </View>
      </View>

      {confirming === "workouts" && (
        <ConfirmActionModal
          title="Clear workout data"
          message="This permanently deletes every workout logged on this device. Your exercises and routines are kept. This can't be undone."
          confirmLabel="Clear workout data"
          onConfirm={() => {
            onClearWorkoutData();
            setConfirming(null);
          }}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming === "backup" && (
        <ConfirmActionModal
          title="Clear backup data"
          message="This permanently deletes your cloud backup. Data on this device isn't affected, but signing in on another device will no longer restore it. This can't be undone."
          confirmLabel="Clear backup data"
          onConfirm={async () => {
            await clearBackupData();
            setConfirming(null);
          }}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming === "delete-account" && (
        <ConfirmActionModal
          title="Delete account"
          message="This permanently deletes your account and everything tied to it on our servers — profile, cloud backup, sign-in. You'll be signed out immediately. Data already on this device isn't affected. This can't be undone."
          confirmLabel="Delete account"
          onConfirm={async () => {
            await deleteAccount();
            setConfirming(null);
          }}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  );
}
