import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  usePersistedState,
  useDayWorkouts,
  useRoutineActions,
  useExerciseActions,
  SEED_EXERCISES,
  reconcileExercises,
  migrateWorkouts,
  generateId,
} from "@barrow/core";
import { asyncStorageAdapter } from "./storage";
import { getActiveAccountId, setActiveAccountId, namespacedKey } from "./accountNamespace";
import { DEFAULT_ACCENT } from "../theme/accentPalette";
import { useCloudSync } from "../hooks/useCloudSync";
import { refreshFocusWidget } from "../widget/refreshFocusWidget";
import { refreshFocusNotification, cancelFocusNotification } from "../notification/focusNotification";
import { clearStaleFocusPointer } from "./staleFocusPointer";

const AppStateContext = createContext(null);

// "Raw" preferences are stored as bare strings (no JSON quoting), same as
// the web app's RAW_UNIT_CODEC reused across unit/theme/workoutView/
// focusSupersetGrouping.
const RAW_CODEC = { serialize: (v) => v, deserialize: (v) => v, storage: asyncStorageAdapter };
const JSON_CODEC = { storage: asyncStorageAdapter };
const EXERCISES_CODEC = { deserialize: (raw) => reconcileExercises(JSON.parse(raw)), storage: asyncStorageAdapter };
const WORKOUTS_CODEC = { deserialize: (raw) => migrateWorkouts(JSON.parse(raw)), storage: asyncStorageAdapter };

const DEFAULT_PROFILE = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  pictureUrl: "",
  birthday: "",
  gender: "",
  height: "",
  weight: "",
  premium: false,
  profileId: `usr-${Math.random().toString(36).slice(2, 10)}`,
};

// Owns every persisted slice of app state (AsyncStorage-backed, via
// @barrow/core's usePersistedState) plus the selection-independent action
// hooks (dayWorkoutsActions/routineActions/exerciseActions). Deliberately
// does NOT instantiate useWorkoutActions — that hook needs a selected
// date/workout, which on mobile lives in a screen's route params rather
// than global state, so Day/ExerciseFocus screens (Phase 3) build it
// themselves from useAppState() + their own route.params.
export function AppStateProvider({ children }) {
  // Which account's local cache is active — null means the guest bucket
  // (the bare "barrow:*" keys every install already used before this
  // feature existed, so nothing needs migrating). Starts null and is
  // corrected moments later once the persisted pointer resolves; the
  // usePersistedState key-change-reset fix (packages/core) makes that
  // brief guest->real-account key swap on cold start safe rather than a
  // race. switchActiveAccount (passed to useCloudSync below) is the only
  // way this changes after mount.
  const [activeAccountId, setActiveAccountIdState] = useState(null);
  useEffect(() => {
    getActiveAccountId().then(setActiveAccountIdState);
  }, []);
  const k = (name) => namespacedKey(name, activeAccountId);

  const [exercises, setExercises, exercisesHydrated] = usePersistedState(k("barrow:exercises"), SEED_EXERCISES, EXERCISES_CODEC);
  const [routines, setRoutines, routinesHydrated] = usePersistedState(k("barrow:routines"), [], {
    ...JSON_CODEC,
    // Only meaningful for the guest bucket — an account namespace never had
    // a pre-rename "templates" key of its own.
    legacyKey: activeAccountId ? undefined : "barrow:templates",
  });
  const [workouts, setWorkouts, workoutsHydrated] = usePersistedState(k("barrow:workouts"), {}, WORKOUTS_CODEC);
  const [unit, setUnit, unitHydrated] = usePersistedState(k("barrow:unit"), "lb", RAW_CODEC);
  const [theme, setTheme, themeHydrated] = usePersistedState(k("barrow:theme"), "system", RAW_CODEC);
  const [accentColor, setAccentColor, accentColorHydrated] = usePersistedState(k("barrow:accentColor"), DEFAULT_ACCENT, RAW_CODEC);
  const [workoutView, setWorkoutView, workoutViewHydrated] = usePersistedState(k("barrow:workoutView"), "focus", RAW_CODEC);
  const [focusSupersetGrouping, setFocusSupersetGrouping, focusSupersetGroupingHydrated] = usePersistedState(
    k("barrow:focusSupersetGrouping"),
    "together",
    RAW_CODEC
  );
  const [profile, setProfile, profileHydrated] = usePersistedState(k("barrow:profile"), DEFAULT_PROFILE, JSON_CODEC);
  const updateProfile = (field, value) => setProfile((p) => ({ ...p, [field]: value }));
  const [focusNotificationEnabled, setFocusNotificationEnabled, focusNotificationEnabledHydrated] = usePersistedState(
    k("barrow:focusNotificationEnabled"),
    "off",
    RAW_CODEC
  );
  const [plateCalculatorEnabled, setPlateCalculatorEnabled, plateCalculatorEnabledHydrated] = usePersistedState(
    k("barrow:plateCalculatorEnabled"),
    false,
    JSON_CODEC
  );
  const [stretchRoutinesEnabled, setStretchRoutinesEnabled, stretchRoutinesEnabledHydrated] = usePersistedState(
    k("barrow:stretchRoutinesEnabled"),
    false,
    JSON_CODEC
  );
  // Whether the Start/End workout timer control is turned on at all — the
  // preference itself, distinct from whether a timer is currently running
  // (see workoutTimerStartedAt below).
  const [workoutTimerEnabled, setWorkoutTimerEnabled, workoutTimerEnabledHydrated] = usePersistedState(
    k("barrow:workoutTimerEnabled"),
    false,
    JSON_CODEC
  );
  // Sub-option of the timer above: whether ending the timer also jumps
  // straight to that workout's summary. Defaults on to match the timer's
  // original (non-optional) behavior before this toggle existed.
  const [workoutTimerAutoOpenSummary, setWorkoutTimerAutoOpenSummary, workoutTimerAutoOpenSummaryHydrated] = usePersistedState(
    k("barrow:workoutTimerAutoOpenSummary"),
    true,
    JSON_CODEC
  );
  // Timestamp (ms) the in-progress workout timer was started, or null when
  // no timer is running — persisted (rather than plain useState) so a
  // timer started before the app was killed/backgrounded is still running,
  // with its correct elapsed time, on relaunch. Set/cleared directly by
  // WorkoutTimerControl's Start/End actions in Day and Focus view, not by
  // the preference toggle above.
  const [workoutTimerStartedAt, setWorkoutTimerStartedAt, workoutTimerStartedAtHydrated] = usePersistedState(
    k("barrow:workoutTimerStartedAt"),
    null,
    JSON_CODEC
  );
  // The header's countdown timer button (AppHeader/CountdownButton), next
  // to Preferences — unlike the workout timer above, always available, no
  // enabled/disabled preference gating it. countdownDurationMs is the last
  // duration the user set (prefills the modal next time it's opened);
  // countdownEndAt is the fixed timestamp (ms) the running countdown ends
  // at, or null when idle — persisted, not a plain useState, so a countdown
  // started before the app is backgrounded/killed keeps counting down
  // accurately (or is correctly reported as finished) on relaunch, same
  // reasoning as workoutTimerStartedAt.
  const [countdownDurationMs, setCountdownDurationMs, countdownDurationMsHydrated] = usePersistedState(
    k("barrow:countdownDurationMs"),
    5 * 60 * 1000,
    JSON_CODEC
  );
  const [countdownEndAt, setCountdownEndAt, countdownEndAtHydrated] = usePersistedState(k("barrow:countdownEndAt"), null, JSON_CODEC);
  // Remaining ms frozen at the moment of pausing, or null when not paused —
  // mutually exclusive with countdownEndAt (running always clears this,
  // pausing always clears that) rather than a separate boolean flag, so
  // there's no third piece of state that could drift out of sync with the
  // other two.
  const [countdownPausedMs, setCountdownPausedMs, countdownPausedMsHydrated] = usePersistedState(
    k("barrow:countdownPausedMs"),
    null,
    JSON_CODEC
  );

  // AND of every slice above — true once a namespace switch (or the
  // initial mount) has fully settled, so useCloudSync knows it's safe to
  // read exercises/routines/workouts/profile for a merge/push rather than
  // catching them mid-reload for a namespace that just changed.
  const localDataHydrated =
    exercisesHydrated &&
    routinesHydrated &&
    workoutsHydrated &&
    unitHydrated &&
    themeHydrated &&
    accentColorHydrated &&
    workoutViewHydrated &&
    focusSupersetGroupingHydrated &&
    profileHydrated &&
    focusNotificationEnabledHydrated &&
    plateCalculatorEnabledHydrated &&
    stretchRoutinesEnabledHydrated &&
    workoutTimerEnabledHydrated &&
    workoutTimerAutoOpenSummaryHydrated &&
    workoutTimerStartedAtHydrated &&
    countdownDurationMsHydrated &&
    countdownEndAtHydrated &&
    countdownPausedMsHydrated;

  // Switches which account's local cache is active: persists the pointer,
  // then flips React state so every usePersistedState key above recomputes
  // and reloads from the new namespace (safe thanks to the key-change fix
  // in packages/core's usePersistedState). Passed into useCloudSync, which
  // is the only caller — see its own comment for when each case applies.
  const switchActiveAccount = async (accountId) => {
    await setActiveAccountId(accountId);
    setActiveAccountIdState(accountId);
  };

  const nextId = generateId;

  // usePersistedState only loads barrow:workouts from disk once, on mount
  // (see its own comment) — it has no way to know a headless widget/
  // notification task wrote to it while this provider sat backgrounded.
  // Without this, the very next debounced save from that same
  // usePersistedState instance would flush stale in-memory `workouts` back
  // over whatever the headless task just wrote. AsyncStorage is the one
  // source of truth (Supabase sync is a separate, optional backup), and by
  // the time the app backgrounds its own last edit is already flushed, so
  // a full overwrite-from-disk on every foreground is always safe, not
  // just a merge of what's newer.
  //
  // Also the "relaunched after being killed" half of the stale-focusPointer
  // guard (see clearStaleFocusPointer) — a foreground transition is exactly
  // when a kill-then-relaunch would surface. Read through a ref rather than
  // closing over focusNotificationEnabled directly, since this effect (like
  // the resync above) subscribes once on mount and would otherwise always
  // see whatever that preference was at that first render.
  const focusNotificationEnabledRef = useRef(focusNotificationEnabled);
  useEffect(() => {
    focusNotificationEnabledRef.current = focusNotificationEnabled;
  }, [focusNotificationEnabled]);

  // Same "read through a ref, not a closure" reasoning as
  // focusNotificationEnabledRef above — this effect also subscribes once on
  // mount, so without a ref it would always resync/clear against whichever
  // namespace was active at that first render, even after switchActiveAccount
  // moves to a different one later.
  const activeAccountIdRef = useRef(activeAccountId);
  useEffect(() => {
    activeAccountIdRef.current = activeAccountId;
  }, [activeAccountId]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      if (next !== "active") return;
      try {
        const raw = await asyncStorageAdapter.getItem(namespacedKey("barrow:workouts", activeAccountIdRef.current));
        if (raw) setWorkouts(migrateWorkouts(JSON.parse(raw)));
      } catch (e) {
        console.error("Barrow: failed to resync barrow:workouts on foreground", e);
      }
      clearStaleFocusPointer(focusNotificationEnabledRef.current, activeAccountIdRef.current).catch((e) =>
        console.error("Barrow: failed to clear stale barrow:focusPointer", e)
      );
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tells Android to redraw the widget/notification right after an in-app
  // edit instead of waiting on the OS's own throttled update cycle —
  // debounced alongside usePersistedState's own save so this fires once
  // per settled edit, not once per keystroke/tap. Also fires on theme/accent
  // changes so a flipped Appearance preference or accent color shows up on
  // the widget right away instead of waiting for its next natural repaint.
  const refreshTimeout = useRef(null);
  useEffect(() => {
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(() => {
      refreshFocusWidget().catch((e) => console.error("Barrow: failed to refresh focus widget", e));
      if (focusNotificationEnabled === "on") {
        refreshFocusNotification().catch((e) => console.error("Barrow: failed to refresh focus notification", e));
      }
    }, 400);
    return () => clearTimeout(refreshTimeout.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, focusNotificationEnabled, theme, accentColor]);

  // Pulls the notification down as soon as the preference is switched off,
  // rather than leaving it up to whatever's showing until the next
  // workouts change would otherwise trigger a refresh.
  useEffect(() => {
    if (focusNotificationEnabled !== "on") cancelFocusNotification().catch((e) => console.error("Barrow: failed to cancel focus notification", e));
  }, [focusNotificationEnabled]);

  const dayWorkoutsActions = useDayWorkouts({ setWorkouts, nextId });
  // Deleting the routine currently open in RoutineDetailScreen is handled
  // by that screen calling navigation.goBack() itself (Phase 3F) rather
  // than this hook managing a global "selected routine" — so the web
  // hook's setSelectedRoutineId callback is a no-op here.
  const routineActions = useRoutineActions({ setRoutines, setWorkouts, setSelectedRoutineId: () => {}, workouts });
  const exerciseActions = useExerciseActions({ setExercises });

  // Resumes a date's most recently added workout, or starts a fresh one —
  // same rule as the web app's openDate, minus the navigation itself (the
  // caller pushes the Day screen with the returned workoutId).
  const getOrCreateWorkoutForDate = (dateKey) => {
    const existing = workouts[dateKey] || [];
    if (existing.length > 0) return existing[existing.length - 1].id;
    return dayWorkoutsActions.createWorkout(dateKey);
  };

  // Full wipe back to a signed-out placeholder — used by useCloudSync's
  // deleteAccount once the account itself is gone server-side, so no
  // profile/biometric field (name, username, birthday, gender, height,
  // weight, picture, email) from the deleted account lingers in local
  // state. Passed down rather than reset inline in AppStateProvider so
  // DEFAULT_PROFILE (defined here) stays the single source of truth for
  // what "signed out" looks like.
  const resetProfile = () => setProfile(DEFAULT_PROFILE);

  const cloudSync = useCloudSync({
    profile, setProfile, resetProfile,
    exercises, setExercises,
    routines, setRoutines,
    workouts, setWorkouts,
    unit, setUnit,
    activeAccountId, switchActiveAccount, localDataHydrated,
  });

  // Wipes every logged workout, routine, and custom exercise/stretch
  // routine on this device (Profile's "Danger zone" — ConfirmActionModal
  // gates the call). Stretch routines aren't a separate slice — they live
  // in `exercises` as custom entries (see addStretchRoutine in
  // useExerciseActions) — so resetting `exercises` back to SEED_EXERCISES
  // drops both custom exercises and stretch routines in one go, while
  // leaving the built-in exercise list intact (reconcileExercises would
  // just reconstruct it from SEED_EXERCISES on the next load anyway). Also
  // clears the in-progress workout timer, since it's meaningless once the
  // workout it was tracking is gone; the debounced push effect above picks
  // up the workouts/routines/exercises changes and re-syncs the (now-empty)
  // history to the cloud like any other edit, so this doesn't touch cloud
  // backup on its own — clearBackupData in useCloudSync does that.
  const clearWorkoutData = () => {
    setWorkouts({});
    setRoutines([]);
    setExercises(SEED_EXERCISES);
    setWorkoutTimerStartedAt(null);
  };

  const value = useMemo(
    () => ({
      exercises,
      setExercises,
      routines,
      setRoutines,
      workouts,
      setWorkouts,
      unit,
      setUnit,
      theme,
      setTheme,
      accentColor,
      setAccentColor,
      workoutView,
      setWorkoutView,
      focusSupersetGrouping,
      setFocusSupersetGrouping,
      focusNotificationEnabled,
      setFocusNotificationEnabled,
      plateCalculatorEnabled,
      setPlateCalculatorEnabled,
      stretchRoutinesEnabled,
      setStretchRoutinesEnabled,
      workoutTimerEnabled,
      setWorkoutTimerEnabled,
      workoutTimerAutoOpenSummary,
      setWorkoutTimerAutoOpenSummary,
      workoutTimerStartedAt,
      setWorkoutTimerStartedAt,
      countdownDurationMs,
      setCountdownDurationMs,
      countdownEndAt,
      setCountdownEndAt,
      countdownPausedMs,
      setCountdownPausedMs,
      profile,
      updateProfile,
      profileHydrated,
      nextId,
      dayWorkoutsActions,
      routineActions,
      exerciseActions,
      getOrCreateWorkoutForDate,
      clearWorkoutData,
      cloudSync,
      // Which account's local cache is active (null = guest bucket) — read
      // by WorkoutTimerBadge/staleFocusPointer call sites that touch
      // barrow:focusPointer directly, outside usePersistedState, so they
      // resolve the same namespace this provider is currently using.
      activeAccountId,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercises, routines, workouts, unit, theme, accentColor, workoutView, focusSupersetGrouping, focusNotificationEnabled, plateCalculatorEnabled, stretchRoutinesEnabled, workoutTimerEnabled, workoutTimerAutoOpenSummary, workoutTimerStartedAt, countdownDurationMs, countdownEndAt, countdownPausedMs, profile, profileHydrated, cloudSync, activeAccountId]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
