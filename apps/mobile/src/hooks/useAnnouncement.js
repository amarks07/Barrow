import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase-client";

const SEEN_KEY = "barrow:announcementSeenId";

// Drives AnnouncementModal — a lightweight one-way broadcast channel for
// admin-authored messages (see the `announcements` table in
// supabase/schema.sql). Fetches the single most recently published row on
// app open and shows it once; any of the modal's exits (cancel, continue, or
// the default backdrop/back-button close) persists its id so it never
// reappears — same "seen once" contract as usePatchNotes.
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, message, cancel_label, continue_label, continue_action")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        if (error) console.error("Barrow: failed to load announcement", error);
        return;
      }
      let seenId = null;
      try {
        seenId = await AsyncStorage.getItem(SEEN_KEY);
      } catch (e) {
        console.error("Barrow: failed to read " + SEEN_KEY, e);
      }
      if (cancelled) return;
      if (seenId !== data.id) {
        setAnnouncement(data);
        setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (announcement) {
      AsyncStorage.setItem(SEEN_KEY, announcement.id).catch((e) => console.error("Barrow: failed to write " + SEEN_KEY, e));
    }
  };

  return { visible, announcement, dismiss };
}
