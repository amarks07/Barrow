import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Cloud backup is opt-in and the app must keep working fully offline
// without it configured, so this is `null` — not a thrown error — when the
// env vars aren't set (e.g. cloned repo before Supabase is wired up).
// flowType "pkce" is the pattern Supabase's own RN/Expo guide recommends —
// deep links don't carry a URL fragment the way a browser redirect does, so
// the implicit flow's #access_token= parsing doesn't apply here.
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      })
    : null;
