import { useFriends } from "../../hooks/useFriends";
import { ScanFriendQRModal } from "./ScanFriendQRModal";

// Thin adapter between useShareDeepLink's global "a friend QR link was
// opened" event and ScanFriendQRModal, which normally only mounts once
// FriendsView is already on screen (and so already has useFriends' state
// from its own call). Rendered from App.js instead, so it needs its own
// instance — same session, same addByPublicId, just a second subscription.
export function IncomingFriendShareModal({ session, data, onClose }) {
  const { addByPublicId } = useFriends(session);
  return <ScanFriendQRModal addByPublicId={addByPublicId} initialData={data} onClose={onClose} />;
}
