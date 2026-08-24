import { asyncStorageAdapter } from "./storage";

// Device-global (never namespaced) pointer: which account's local cache is
// currently active. null/absent means the "guest" bucket — the bare
// "barrow:*" keys every install already uses today, so a fresh sign-in on
// an existing (pre-multi-account) install needs no migration script at all.
const ACTIVE_ACCOUNT_KEY = "barrow:activeAccountId";

export async function getActiveAccountId() {
  return (await asyncStorageAdapter.getItem(ACTIVE_ACCOUNT_KEY)) || null;
}

export async function setActiveAccountId(accountId) {
  if (accountId) await asyncStorageAdapter.setItem(ACTIVE_ACCOUNT_KEY, accountId);
  else await asyncStorageAdapter.removeItem(ACTIVE_ACCOUNT_KEY);
}

// Rewrites a bare "barrow:xxx" key to the active account's namespace
// ("barrow:<accountId>:xxx"). Leaves the key unchanged for the guest
// bucket (accountId == null/undefined) — see ACTIVE_ACCOUNT_KEY above.
export function namespacedKey(baseKey, accountId) {
  return accountId ? baseKey.replace(/^barrow:/, `barrow:${accountId}:`) : baseKey;
}

// Wraps a plain {getItem,setItem,removeItem} storage adapter so every key
// it's asked to touch is transparently namespaced to `accountId` — for
// headless contexts (widget/notification tasks) that resolve the active
// account once per invocation (via getActiveAccountId) rather than holding
// it in React state like AppStateProvider does.
export function withAccountNamespace(storage, accountId) {
  return {
    getItem: (key) => storage.getItem(namespacedKey(key, accountId)),
    setItem: (key, value) => storage.setItem(namespacedKey(key, accountId), value),
    removeItem: (key) => storage.removeItem(namespacedKey(key, accountId)),
  };
}

// Every bare key a local account's cache is made of — used only by the
// claim/clear helpers below (AppStateProvider's usePersistedState calls
// build their own namespaced key strings directly via namespacedKey, not
// through this list). Kept in one place so claiming/clearing guest data
// can't silently miss a slice that AppStateProvider itself persists.
export const ACCOUNT_DATA_KEYS = [
  "barrow:exercises",
  "barrow:routines",
  "barrow:workouts",
  "barrow:unit",
  "barrow:theme",
  "barrow:accentColor",
  "barrow:workoutView",
  "barrow:focusSupersetGrouping",
  "barrow:profile",
  "barrow:focusNotificationEnabled",
  "barrow:plateCalculatorEnabled",
  "barrow:stretchRoutinesEnabled",
  "barrow:workoutTimerEnabled",
  "barrow:workoutTimerAutoOpenSummary",
  "barrow:workoutTimerStartedAt",
  "barrow:countdownDurationMs",
  "barrow:countdownEndAt",
  "barrow:countdownPausedMs",
  "barrow:focusPointer",
  "barrow:lastSyncedAt",
];

// Copies every currently-set guest-bucket (bare-key) value forward to
// `accountId`'s own namespace, without touching or deleting the guest
// bucket itself. Used when an account "claims" pre-existing, unowned local
// data — either silently on first-launch-after-upgrade continuity (a
// restored session finding activeAccountId still null), or explicitly when
// signing up for a brand-new account while guest data is present (guest
// data has no prior owner, so it correctly becomes the new account's own).
export async function claimGuestDataForAccount(accountId) {
  for (const base of ACCOUNT_DATA_KEYS) {
    const value = await asyncStorageAdapter.getItem(base);
    if (value !== null && value !== undefined) {
      await asyncStorageAdapter.setItem(namespacedKey(base, accountId), value);
    }
  }
}

// Wipes the guest bucket outright — used only when the user explicitly
// chooses to replace it (the account-conflict prompt's "Replace" action),
// matching that "otherwise the data will be wiped" is a real, deliberate
// choice rather than a silent side effect of switching accounts.
export async function clearGuestData() {
  for (const base of ACCOUNT_DATA_KEYS) {
    await asyncStorageAdapter.removeItem(base);
  }
}

// Wipes accountId's entire local namespace outright — every key in
// ACCOUNT_DATA_KEYS, rewritten to that account's namespace. Used on sign-out
// so a signed-out account's workouts/routines/exercises/profile/preferences
// don't linger on a shared device once nobody's authenticated as that
// account anymore. A direct AsyncStorage wipe rather than relying solely on
// resetting in-memory state and letting usePersistedState's normal debounced
// save catch up: that save is 400ms behind the setState calls, and the
// foreground-resync effect (AppStateProvider) re-reads barrow:workouts from
// disk on every AppState "active" transition, so a stale on-disk value could
// otherwise stomp the just-cleared in-memory state right back to what it was
// before sign-out.
export async function clearAccountData(accountId) {
  for (const base of ACCOUNT_DATA_KEYS) {
    await asyncStorageAdapter.removeItem(namespacedKey(base, accountId));
  }
}
