import { ProfileView } from "../../components/profile/ProfileView";
import { useAppState } from "../../state/AppStateProvider";

// Only reached when signed in now — MainStack handles the signed-out case
// by showing SignInModal as a local overlay instead of navigating here, so
// this route never needs to decide between the two.
export function ProfileScreen({ navigation }) {
  const { profile, updateProfile, cloudSync } = useAppState();
  return <ProfileView profile={profile} onUpdate={updateProfile} onClose={() => navigation.goBack()} cloudSync={cloudSync} />;
}
