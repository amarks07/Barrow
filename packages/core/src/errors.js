const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

// Logs the real error to the console, tagged with `scope` so it's easy to
// grep for locally (e.g. "Barrow [friends.refresh]: ..."). This is the one
// place raw error objects/Postgres-Supabase messages are allowed to surface
// — everywhere else should show `fallback` instead, never `error.message`
// directly, since that text is written for developers, not end users.
export function logError(scope, error) {
  console.error(`Barrow [${scope}]:`, error);
}

// Logs `error` under `scope` and returns a UI-safe message: the common case
// for a catch block that both needs to log for local debugging and show
// something friendly to the user instead of the raw error.
export function reportError(scope, error, fallback = DEFAULT_MESSAGE) {
  logError(scope, error);
  return fallback;
}
