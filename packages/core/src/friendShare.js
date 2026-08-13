export const FRIEND_SHARE_TYPE = "barrow-friend";
export const FRIEND_SHARE_VERSION = 1;

// Turns a Profile ID into the QR payload for the friends flow — same
// build/parse split as routineShare.js, just carrying a single id instead of
// a whole routine.
export function buildFriendShare(publicId) {
  return { t: FRIEND_SHARE_TYPE, v: FRIEND_SHARE_VERSION, id: publicId };
}

// Parses+validates a scanned QR payload. Throws a message fit to show the
// user directly.
export function parseFriendShare(raw) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new Error("That doesn't look like a Barrow friend code.");
  }
  if (!data || data.t !== FRIEND_SHARE_TYPE || typeof data.id !== "string" || !data.id) {
    throw new Error("That doesn't look like a Barrow friend code.");
  }
  return data;
}
