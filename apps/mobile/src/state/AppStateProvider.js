import { createContext, useContext, useMemo, useRef } from "react";
import {
  usePersistedState,
  useDayWorkouts,
  useTemplateActions,
  useExerciseActions,
  SEED_EXERCISES,
  reconcileExercises,
  migrateWorkouts,
} from "@barrow/core";
import { asyncStorageAdapter } from "./storage";
import { useCloudSync } from "../hooks/useCloudSync";

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
  profileId: `usr-${Math.random().toString(36).slice(2, 10)}`,
};

// Owns every persisted slice of app state (AsyncStorage-backed, via
// @barrow/core's usePersistedState) plus the selection-independent action
// hooks (dayWorkoutsActions/templateActions/exerciseActions). Deliberately
// does NOT instantiate useWorkoutActions — that hook needs a selected
// date/workout, which on mobile lives in a screen's route params rather
// than global state, so Day/ExerciseFocus screens (Phase 3) build it
// themselves from useAppState() + their own route.params.
export function AppStateProvider({ children }) {
  const [exercises, setExercises] = usePersistedState("barrow:exercises", SEED_EXERCISES, EXERCISES_CODEC);
  const [templates, setTemplates] = usePersistedState("barrow:templates", [], JSON_CODEC);
  const [workouts, setWorkouts] = usePersistedState("barrow:workouts", {}, WORKOUTS_CODEC);
  const [unit, setUnit] = usePersistedState("barrow:unit", "lb", RAW_CODEC);
  const [theme, setTheme] = usePersistedState("barrow:theme", "dark", RAW_CODEC);
  const [workoutView, setWorkoutView] = usePersistedState("barrow:workoutView", "classic", RAW_CODEC);
  const [focusSupersetGrouping, setFocusSupersetGrouping] = usePersistedState(
    "barrow:focusSupersetGrouping",
    "together",
    RAW_CODEC
  );
  const [profile, setProfile] = usePersistedState("barrow:profile", DEFAULT_PROFILE, JSON_CODEC);
  const updateProfile = (field, value) => setProfile((p) => ({ ...p, [field]: value }));

  const idRef = useRef(0);
  const nextId = () => `s${Date.now()}-${idRef.current++}`;

  const dayWorkoutsActions = useDayWorkouts({ setWorkouts, nextId });
  // Deleting the template currently open in TemplateDetailScreen is handled
  // by that screen calling navigation.goBack() itself (Phase 3F) rather
  // than this hook managing a global "selected template" — so the web
  // hook's setSelectedTemplateId callback is a no-op here.
  const templateActions = useTemplateActions({ setTemplates, setWorkouts, setSelectedTemplateId: () => {}, workouts });
  const exerciseActions = useExerciseActions({ setExercises });

  // Resumes a date's most recently added workout, or starts a fresh one —
  // same rule as the web app's openDate, minus the navigation itself (the
  // caller pushes the Day screen with the returned workoutId).
  const getOrCreateWorkoutForDate = (dateKey) => {
    const existing = workouts[dateKey] || [];
    if (existing.length > 0) return existing[existing.length - 1].id;
    return dayWorkoutsActions.createWorkout(dateKey);
  };

  const cloudSync = useCloudSync({
    profile, setProfile,
    exercises, setExercises,
    templates, setTemplates,
    workouts, setWorkouts,
    unit, setUnit,
  });

  const value = useMemo(
    () => ({
      exercises,
      setExercises,
      templates,
      setTemplates,
      workouts,
      setWorkouts,
      unit,
      setUnit,
      theme,
      setTheme,
      workoutView,
      setWorkoutView,
      focusSupersetGrouping,
      setFocusSupersetGrouping,
      profile,
      updateProfile,
      nextId,
      dayWorkoutsActions,
      templateActions,
      exerciseActions,
      getOrCreateWorkoutForDate,
      cloudSync,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercises, templates, workouts, unit, theme, workoutView, focusSupersetGrouping, profile, cloudSync]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
