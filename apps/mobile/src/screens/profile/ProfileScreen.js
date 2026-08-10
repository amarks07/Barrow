import { ProfileView } from "../../components/profile/ProfileView";
import { useAppState } from "../../state/AppStateProvider";

// Reachable whether or not the user is signed in — ProfileView (via
// CloudBackupSection) shows a "Sign in/up" CTA in place of sync status when
// there's no session, rather than this screen bouncing back to Tabs.
export function ProfileScreen({ navigation }) {
  const { profile, updateProfile, cloudSync, clearWorkoutData } = useAppState();

  return (
    <ProfileView
      profile={profile}
      onUpdate={updateProfile}
      onClose={() => navigation.goBack()}
      cloudSync={cloudSync}
      onClearWorkoutData={clearWorkoutData}
    />
  );
}
