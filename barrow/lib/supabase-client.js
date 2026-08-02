import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cloud backup is opt-in and the app must keep working fully offline
// without it configured, so this is `null` — not a thrown error — when the
// env vars aren't set (e.g. cloned repo before Supabase is wired up).
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
