"use client";

import { useRef, useState } from "react";

import { AppHeader } from "../components/layout/AppHeader";
import { BottomNav } from "../components/layout/BottomNav";
import { CalendarView } from "../components/calendar/CalendarView";
import { ExercisesView } from "../components/exercises/ExercisesView";
import { TemplatesView } from "../components/templates/TemplatesView";
import { TemplateDetailView } from "../components/templates/TemplateDetailView";
import { DayView } from "../components/workout/DayView";
import { HistoryView } from "../components/history/HistoryView";
import { ProfileView } from "../components/profile/ProfileView";

import { usePersistedState } from "../hooks/usePersistedState";
import { useWorkoutActions } from "../hooks/useWorkoutActions";
import { useTemplateActions } from "../hooks/useTemplateActions";
import { useExerciseActions } from "../hooks/useExerciseActions";
import { useTabSwipe } from "../hooks/useTabSwipe";

import { SEED_EXERCISES, reconcileExercises } from "../lib/constants";
import { toKey } from "../lib/date";

const TABS = [
  { id: "calendar", label: "Calendar" },
  { id: "exercises", label: "Exercises" },
  { id: "templates", label: "Templates" },
];

const RAW_UNIT_CODEC = { serialize: (v) => v, deserialize: (v) => v };
const EXERCISES_CODEC = { deserialize: (raw) => reconcileExercises(JSON.parse(raw)) };

export default function BarrowApp() {
  const [exercises, setExercises] = usePersistedState("barrow:exercises", SEED_EXERCISES, EXERCISES_CODEC);
  const [templates, setTemplates] = usePersistedState("barrow:templates", []);
  const [workouts, setWorkouts] = usePersistedState("barrow:workouts", {});
  const [unit, setUnit] = usePersistedState("barrow:unit", "lb", RAW_UNIT_CODEC);
  const [profile, setProfile] = usePersistedState("barrow:profile", () => ({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    pictureUrl: "",
    profileId: `usr-${Math.random().toString(36).slice(2, 10)}`,
  }));
  const updateProfile = (field, value) => setProfile((p) => ({ ...p, [field]: value }));

  const [exerciseView, setExerciseView] = useState("grouped");
  const [tab, setTab] = useState("calendar");
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [historyExId, setHistoryExId] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const idRef = useRef(0);
  const nextId = () => `s${Date.now()}-${idRef.current++}`;

  // History and day view take over the whole screen; template detail sits
  // "under" a day view so returning from a day drops back into it.
  const view = historyExId ? "history" : selectedDate ? "day" : selectedTemplateId ? "templateDetail" : tab;
  const showChrome = view !== "day" && view !== "history" && view !== "templateDetail";

  const workoutActions = useWorkoutActions({ selectedDate, setWorkouts, templates, exercises, unit, nextId });
  const templateActions = useTemplateActions({ setTemplates, setWorkouts, setSelectedTemplateId, workouts });
  const exerciseActions = useExerciseActions({ setExercises });
  const tabSwipe = useTabSwipe({ enabled: showChrome, tabs: TABS, activeTab: tab, onChangeTab: setTab });

  return (
    <div className="w-full flex justify-center font" style={{ background: "var(--bg)", height: "100dvh" }}>
      <div className="relative w-full max-w-[420px] h-full flex flex-col">
        <AppHeader unit={unit} onUnitChange={setUnit} profile={profile} onOpenProfile={() => setProfileOpen(true)} />

        <div className="flex-1 min-h-0 relative" onTouchStart={tabSwipe.onTouchStart} onTouchEnd={tabSwipe.onTouchEnd}>
          {view === "calendar" && (
            <div className="h-full overflow-y-auto no-scrollbar" style={{ paddingBottom: "calc(9rem + env(safe-area-inset-bottom))" }}>
              <CalendarView
                monthCursor={monthCursor}
                setMonthCursor={setMonthCursor}
                workouts={workouts}
                onSelectDay={setSelectedDate}
              />
            </div>
          )}

          {view === "exercises" && (
            <ExercisesView
              exercises={exercises}
              exerciseView={exerciseView}
              setExerciseView={setExerciseView}
              onOpenHistory={setHistoryExId}
              onAddCustom={exerciseActions.addCustomExercise}
              onDeleteExercise={exerciseActions.deleteExercise}
            />
          )}

          {view === "templates" && (
            <TemplatesView
              templates={templates}
              exercises={exercises}
              onCreate={templateActions.createTemplate}
              onDelete={templateActions.deleteTemplate}
              onOpenTemplate={setSelectedTemplateId}
            />
          )}

          {view === "templateDetail" && (
            <TemplateDetailView
              template={templates.find((t) => t.id === selectedTemplateId)}
              exercises={exercises}
              workouts={workouts}
              onBack={() => setSelectedTemplateId(null)}
              onDelete={templateActions.deleteTemplate}
              onSelectDate={(dateKey) => setSelectedDate(dateKey)}
              onAddExercise={templateActions.addExerciseToTemplate}
              onRemoveExercise={templateActions.removeExerciseFromTemplate}
            />
          )}

          {view === "day" && (
            <DayView
              dateKey={selectedDate}
              workout={workouts[selectedDate]}
              exercises={exercises}
              templates={templates}
              unit={unit}
              workouts={workouts}
              onBack={() => setSelectedDate(null)}
              onOpenHistory={setHistoryExId}
              onSaveAsTemplate={templateActions.saveWorkoutAsTemplate}
              {...workoutActions}
            />
          )}

          {view === "history" && (
            <HistoryView
              exercise={exercises.find((e) => e.id === historyExId)}
              workouts={workouts}
              unit={unit}
              onBack={() => setHistoryExId(null)}
            />
          )}
        </div>

        <BottomNav
          visible={showChrome}
          tabs={TABS}
          activeTab={tab}
          onChangeTab={setTab}
          showStartWorkout={tab === "calendar"}
          onStartWorkout={() => setSelectedDate(toKey(new Date()))}
        />

        {profileOpen && (
          <ProfileView profile={profile} onUpdate={updateProfile} onClose={() => setProfileOpen(false)} />
        )}
      </div>
    </div>
  );
}
