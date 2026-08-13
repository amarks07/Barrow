import { useCallback, useEffect, useState } from "react";
import { reportError } from "@barrow/core";
import { supabase } from "../lib/supabase-client";

// Maps a `friendships` row (from list_friendships()) into the shape
// FriendsView renders — camelCased and with `status`/`isIncoming` kept apart
// from the profile fields so the UI doesn't have to know the db's column
// names.
function mapRow(row) {
  return {
    friendshipId: row.friendship_id,
    status: row.status, // "pending" | "accepted"
    isIncoming: row.is_incoming,
    id: row.other_id,
    publicId: row.public_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    pictureUrl: row.picture_url,
  };
}

// Drives the Friends screen's data: the combined friends/requests list (one
// row per friendship the signed-in user is part of, via the list_friendships
// RPC — see supabase/schema.sql for why a plain `.from("friendships")`
// select can't join in the *other* party's profile fields), search, and the
// three mutations (send/respond/remove). Search is exposed as a plain async
// function rather than hook state, since FriendsView owns the query/results
// state itself (debouncing, clearing on navigation, etc.) — this hook only
// owns what's shared/persisted: the friendships list.
export function useFriends(session) {
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!supabase || !session) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase.rpc("list_friendships");
    if (fetchError) setError(reportError("friends.refresh", fetchError, "Couldn't load your friends. Check your connection and try again."));
    else {
      setError(null);
      setFriendships(data.map(mapRow));
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session) refresh();
    else setFriendships([]);
  }, [session, refresh]);

  // Doesn't touch `friendships`/`error` state — FriendsView owns the
  // search query/results itself and calls this directly. useCallback with no
  // deps (supabase is a module-level singleton) so FriendsView's debounce
  // effect doesn't reset on every unrelated re-render.
  const search = useCallback(async (query) => {
    const { data, error: searchError } = await supabase.rpc("search_profiles", { query });
    if (searchError) throw new Error(reportError("friends.search", searchError, "Search failed. Try again."));
    return data.map((row) => ({
      id: row.id,
      publicId: row.public_id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      pictureUrl: row.picture_url,
    }));
  }, []);

  const addByPublicId = useCallback(
    async (publicId) => {
      const { data, error: addError } = await supabase.rpc("add_friend_by_public_id", { target_public_id: publicId });
      if (addError) throw new Error(reportError("friends.add", addError, "Couldn't add that friend. Try again."));
      await refresh();
      const added = data?.[0];
      return added ? { username: added.username, firstName: added.first_name, lastName: added.last_name } : null;
    },
    [refresh]
  );

  const sendRequest = useCallback(
    async (targetId) => {
      const { error: requestError } = await supabase.rpc("send_friend_request", { target_id: targetId });
      if (requestError) throw new Error(reportError("friends.sendRequest", requestError, "Couldn't send that request. Try again."));
      await refresh();
    },
    [refresh]
  );

  // `accept` updates status (allowed by friendships_update_recipient — only
  // the recipient can do this); declining/cancelling/unfriending are all the
  // same delete regardless of which of those three this actually is from the
  // caller's perspective (see friendships_delete_own in supabase/schema.sql).
  const respond = useCallback(
    async (friendshipId, accept) => {
      const { error: respondError } = accept
        ? await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", friendshipId)
        : await supabase.from("friendships").delete().eq("id", friendshipId);
      if (respondError) {
        throw new Error(reportError("friends.respond", respondError, accept ? "Couldn't accept that request. Try again." : "Couldn't do that. Try again."));
      }
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (friendshipId) => {
      const { error: removeError } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (removeError) throw new Error(reportError("friends.remove", removeError, "Couldn't remove that friend. Try again."));
      await refresh();
    },
    [refresh]
  );

  return { friendships, loading, error, refresh, search, addByPublicId, sendRequest, respond, remove };
}
