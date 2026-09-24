import { useCallback, useEffect, useMemo, useState } from "react";
import { reportError } from "@barrow/core";
import { supabase } from "../lib/supabase-client";
import { getMissingProfileFields } from "./useProfileOnboarding";

// Maps a `list_notifications()` row into the shape NotificationsView renders
// — camelCased, with the actor's profile fields (present only for
// requester_id-carrying types like friend_request/friend_added) kept apart
// from the notification's own fields.
function mapRow(row) {
  return {
    id: row.id,
    type: row.type,
    data: row.data,
    read: row.read,
    urgent: row.urgent,
    createdAt: row.created_at,
    actorId: row.actor_id,
    actorUsername: row.actor_username,
    actorFirstName: row.actor_first_name,
    actorLastName: row.actor_last_name,
    actorPictureUrl: row.actor_picture_url,
  };
}

// Drives the profile hub's notification badge and the Notifications screen
// itself. Combines two sources, same "some local, some from a table" split
// the feature was asked for: a single synthetic item for missing biometric
// fields (computed straight from `profile`, via the same
// getMissingProfileFields already used by ProfileOnboardingModal — nothing
// is ever persisted for it, it just stops existing once the fields are
// filled in) and the real `notifications` table rows (friend requests/adds
// today, more types later) via the list_notifications RPC. Pull-on-mount +
// pull-on-session-change, same as useFriends — no realtime subscription
// exists anywhere in this codebase yet.
export function useNotifications(session, profile) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedLocalIds, setDismissedLocalIds] = useState(() => new Set());

  const refresh = useCallback(async () => {
    if (!supabase || !session) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase.rpc("list_notifications");
    if (fetchError) {
      setError(reportError("notifications.refresh", fetchError, "Couldn't load your notifications. Check your connection and try again."));
    } else {
      setError(null);
      setRows(data.map(mapRow));
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session) refresh();
    else setRows([]);
  }, [session, refresh]);

  const missingFields = getMissingProfileFields(profile);

  // Local item is pinned first regardless of `createdAt` (it doesn't really
  // have one) — it's about the account's current state, not a point-in-time
  // event, so it stays the most immediately actionable thing in the list.
  const items = useMemo(() => {
    const local =
      missingFields.length > 0 && !dismissedLocalIds.has("missing-biometrics")
        ? [{ id: "missing-biometrics", type: "local", read: false, missingFields }]
        : [];
    return [...local, ...rows];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingFields.join(","), rows, dismissedLocalIds]);

  const unreadCount = items.filter((item) => !item.read).length;

  // Drives UrgentNotificationModal — the first unread row with `urgent` set
  // (see the column in supabase/schema.sql), shown on app open regardless of
  // whether the Notifications screen itself has ever been opened. Only one
  // at a time: closing it marks that row read (below), which drops it from
  // this search so the next-most-recent urgent row (if any) surfaces on the
  // following render rather than stacking every urgent row into one queue.
  const urgentItem = rows.find((r) => r.urgent && !r.read) || null;

  // Marks a single row read without dismissing it — unlike `dismiss`, this
  // leaves it in the list (still visible, just no longer unread), since
  // closing the urgent modal isn't the same user action as clearing the
  // notification from the list entirely.
  const markRead = useCallback(
    async (item) => {
      if (!supabase || !session) return;
      const { error: updateError } = await supabase.from("notifications").update({ read: true }).eq("id", item.id);
      if (updateError) {
        reportError("notifications.markRead", updateError, "Couldn't update that notification.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, read: true } : r)));
    },
    [session]
  );

  // Only touches the table-backed rows — the local missing-biometrics item
  // has no persisted read state and disappears on its own once the profile
  // fields are filled in.
  const markAllRead = useCallback(async () => {
    if (!supabase || !session || rows.every((r) => r.read)) return;
    const { error: updateError } = await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
    if (updateError) {
      reportError("notifications.markAllRead", updateError, "Couldn't update your notifications.");
      return;
    }
    setRows((prev) => prev.map((r) => ({ ...r, read: true })));
  }, [session, rows]);

  // Removes one item from the list. The synthetic missing-biometrics item
  // has nothing to persist server-side, so dismissing it just hides it
  // locally — it comes back if the profile fields go missing again since
  // nothing about it is persisted. Table-backed rows are a soft delete (an
  // update, not a delete): `dismissed` records that the user cleared it
  // rather than erasing the row, and list_notifications excludes dismissed
  // rows going forward — same plain client-side update as markAllRead,
  // covered by the existing notifications_update_own policy.
  const dismiss = useCallback(
    async (item) => {
      if (item.type === "local") {
        setDismissedLocalIds((prev) => new Set(prev).add(item.id));
        return;
      }
      if (!supabase || !session) return;
      const { error: updateError } = await supabase.from("notifications").update({ dismissed: true }).eq("id", item.id);
      if (updateError) {
        reportError("notifications.dismiss", updateError, "Couldn't dismiss that notification.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== item.id));
    },
    [session]
  );

  return { items, unreadCount, loading, error, refresh, markAllRead, markRead, dismiss, urgentItem };
}
