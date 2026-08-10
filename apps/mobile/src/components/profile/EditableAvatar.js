import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Pencil, User } from "lucide-react-native";
import { ChangeProfilePictureSheet } from "./ChangeProfilePictureSheet";
import { SignInModal } from "./SignInModal";
import { ErrorModal } from "../ui/ErrorModal";
import { useProfilePicture } from "../../hooks/useProfilePicture";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

const SIZE = 84;

// The profile picture circle with a tap-to-edit affordance — shared by
// ProfileView's hub and ProfileSettingsView's identity page so both stay in
// sync rather than duplicating the picker/upload wiring twice. Tapping opens
// ChangeProfilePictureSheet when signed in, or SignInModal when not, since
// picture upload needs a Supabase session (see useProfilePicture.js).
export function EditableAvatar({ profile, onUpdate, cloudSync }) {
  const { tokens } = useTheme();
  const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase();
  const [showPictureSheet, setShowPictureSheet] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const profilePicture = useProfilePicture({ session: cloudSync.session, onUpdate });

  // A successful sign-in closes the modal on its own — same as
  // ProfileView's/CloudBackupSection's own SignInModal instance.
  useEffect(() => {
    if (cloudSync.session) setShowSignIn(false);
  }, [cloudSync.session]);

  const onPress = () => {
    if (cloudSync.session) setShowPictureSheet(true);
    else setShowSignIn(true);
  };

  return (
    <>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Change profile picture">
        <View
          className="items-center justify-center overflow-hidden"
          style={{ width: SIZE, height: SIZE, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
        >
          {profile.pictureUrl ? (
            <Image source={{ uri: profile.pictureUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : initials ? (
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: tokens.textDim }}>{initials}</Text>
          ) : (
            <User size={32} color={tokens.textDim} />
          )}
          {profilePicture.uploading && (
            <View
              className="items-center justify-center"
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" }}
            >
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>
        <View
          className="items-center justify-center"
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 26,
            height: 26,
            borderRadius: 999,
            backgroundColor: tokens.accent,
            borderWidth: 1.5,
            borderColor: tokens.bg,
          }}
        >
          <Pencil size={12} color="#121214" />
        </View>
      </Pressable>

      {showPictureSheet && (
        <ChangeProfilePictureSheet
          hasPicture={!!profile.pictureUrl}
          profilePicture={profilePicture}
          onClose={() => setShowPictureSheet(false)}
        />
      )}
      {showSignIn && <SignInModal cloudSync={cloudSync} onClose={() => setShowSignIn(false)} />}
      {profilePicture.error && (
        <ErrorModal title={profilePicture.error.title} message={profilePicture.error.message} onClose={profilePicture.dismissError} />
      )}
    </>
  );
}
