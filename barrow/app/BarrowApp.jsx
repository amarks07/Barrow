"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, ArrowLeft, Trash2, Check, User } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Seed data                                                            */
/* ------------------------------------------------------------------ */
const CATEGORIES = ["Chest","Back","Legs","Shoulders","Arms","Core","Cardio","Full Body"];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const RAW_EXERCISES = [
  ["Bench Press","Chest"],["Incline Bench Press","Chest"],["Decline Bench Press","Chest"],
  ["Incline Dumbbell Press","Chest"],["Decline Dumbbell Press","Chest"],["Dumbbell Bench Press","Chest"],
  ["Push-Up","Chest"],["Cable Fly","Chest"],["Pec Deck","Chest"],["Chest Dip","Chest"],
  ["Machine Chest Press","Chest"],["Dumbbell Pullover","Chest"],
  ["Deadlift","Back"],["Sumo Deadlift","Back"],["Rack Pull","Back"],["Barbell Row","Back"],
  ["Pendlay Row","Back"],["T-Bar Row","Back"],["Seated Cable Row","Back"],["Lat Pulldown","Back"],
  ["Pull-Up","Back"],["Chin-Up","Back"],["Single-Arm Dumbbell Row","Back"],["Straight-Arm Pulldown","Back"],
  ["Back Extension","Back"],["Shrug","Back"],
  ["Back Squat","Legs"],["Front Squat","Legs"],["Goblet Squat","Legs"],["Hack Squat","Legs"],
  ["Leg Press","Legs"],["Romanian Deadlift","Legs"],["Stiff-Leg Deadlift","Legs"],["Walking Lunge","Legs"],
  ["Reverse Lunge","Legs"],["Bulgarian Split Squat","Legs"],["Leg Curl","Legs"],["Leg Extension","Legs"],
  ["Hip Thrust","Legs"],["Glute Bridge","Legs"],["Calf Raise","Legs"],["Seated Calf Raise","Legs"],
  ["Step-Up","Legs"],["Sissy Squat","Legs"],["Hip Adductor Machine","Legs"],["Hip Abductor Machine","Legs"],
  ["Overhead Press","Shoulders"],["Seated Dumbbell Press","Shoulders"],["Arnold Press","Shoulders"],
  ["Lateral Raise","Shoulders"],["Cable Lateral Raise","Shoulders"],["Front Raise","Shoulders"],
  ["Rear Delt Fly","Shoulders"],["Face Pull","Shoulders"],["Upright Row","Shoulders"],
  ["Shoulder Press Machine","Shoulders"],["Landmine Press","Shoulders"],
  ["Barbell Curl","Arms"],["EZ-Bar Curl","Arms"],["Dumbbell Curl","Arms"],["Hammer Curl","Arms"],
  ["Preacher Curl","Arms"],["Concentration Curl","Arms"],["Cable Curl","Arms"],["Tricep Pushdown","Arms"],
  ["Overhead Tricep Extension","Arms"],["Skull Crusher","Arms"],["Close-Grip Bench Press","Arms"],
  ["Tricep Dip","Arms"],["Cable Kickback","Arms"],
  ["Plank","Core"],["Side Plank","Core"],["Hanging Leg Raise","Core"],["Cable Crunch","Core"],
  ["Sit-Up","Core"],["Crunch","Core"],["Russian Twist","Core"],["Bicycle Crunch","Core"],
  ["Ab Wheel Rollout","Core"],["Mountain Climber","Core"],["Woodchopper","Core"],["Dead Bug","Core"],["V-Up","Core"],
  ["Treadmill Run","Cardio"],["Treadmill Incline Walk","Cardio"],["Rowing Machine","Cardio"],
  ["Assault Bike","Cardio"],["Stationary Bike","Cardio"],["Elliptical","Cardio"],["Stair Climber","Cardio"],
  ["Jump Rope","Cardio"],["Swimming","Cardio"],["Sprint Intervals","Cardio"],
  ["Kettlebell Swing","Full Body"],["Clean and Jerk","Full Body"],["Snatch","Full Body"],["Burpee","Full Body"],
  ["Thruster","Full Body"],["Man Maker","Full Body"],["Turkish Get-Up","Full Body"],
  ["Farmer's Carry","Full Body"],["Wall Ball","Full Body"],["Battle Ropes","Full Body"],
];

const SEED_EXERCISES = RAW_EXERCISES.map(([name, category]) => ({
  id: slug(name), name, category, custom: false,
}));


/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthLabel = (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const dayLabel = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};
const shortDayLabel = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function buildMonthGrid(cursor) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

/* ------------------------------------------------------------------ */
/* Unit conversion + first-set weight/rep recommendation helpers        */
/* ------------------------------------------------------------------ */
const LB_PER_KG = 2.20462;
const roundHalf = (n) => Math.round(n * 2) / 2;

function convertWeight(value, fromUnit, toUnit) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  if (!fromUnit || fromUnit === toUnit) return num;
  const converted = fromUnit === "kg" ? num * LB_PER_KG : num / LB_PER_KG;
  return roundHalf(converted);
}

const KMH_PER_MPH = 1.60934;
// Cardio speed reuses the same lb/kg toggle as an imperial/metric preference:
// "lb" system displays mph, "kg" system displays km/h.
function convertSpeed(value, fromUnit, toUnit) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  if (!fromUnit || fromUnit === toUnit) return num;
  const converted = fromUnit === "kg" ? num * KMH_PER_MPH : num / KMH_PER_MPH;
  return roundHalf(converted);
}

const fmtNum = (n) => {
  if (n === "" || n === null || n === undefined || Number.isNaN(n)) return "–";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

function getRepRange(exerciseId, workouts, excludeDateKey) {
  let max = 0;
  Object.entries(workouts).forEach(([dateKey, w]) => {
    if (dateKey === excludeDateKey) return;
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) return;
    entry.sets.forEach((s) => {
      const r = parseFloat(s.reps);
      if (!Number.isNaN(r) && r > max) max = r;
    });
  });
  const fromHistory = max > 0;
  const repHigh = fromHistory ? max : 12;
  const repLow = Math.max(repHigh - 4, 1);
  return { repLow, repHigh, fromHistory };
}

function getRecommendation(exerciseId, workouts, unit, excludeDateKey, repLow = 8, repHigh = 12) {
  const increment = unit === "kg" ? 2.5 : 5;
  const dateKeys = Object.keys(workouts).filter((k) => k !== excludeDateKey).sort((a, b) => (a < b ? 1 : -1));

  for (const dateKey of dateKeys) {
    const entry = workouts[dateKey].entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) continue;

    let top = null;
    entry.sets.forEach((s) => {
      const w = convertWeight(s.weight, s.unit || unit, unit);
      const wNum = w === "" ? 0 : w;
      const repsNum = parseFloat(s.reps) || 0;
      if (repsNum <= 0) return;
      if (!top || wNum > top.weight || (wNum === top.weight && repsNum > top.reps)) {
        top = { weight: wNum, reps: repsNum };
      }
    });
    if (!top) continue;

    let recWeight, recReps, note;
    if (top.reps >= repHigh) {
      recWeight = roundHalf(top.weight + increment);
      recReps = repLow;
      note = `+${fmtNum(increment)} ${unit} · reset reps`;
    } else {
      recWeight = top.weight;
      recReps = Math.min(top.reps + 1, repHigh);
      note = recReps > top.reps ? "+1 rep" : "hold steady";
    }
    return { basedOn: dateKey, lastWeight: top.weight, lastReps: top.reps, recWeight, recReps, note };
  }
  return null;
}

// Total weight×reps for a given exercise on each day it was logged —
// the "volume" series the history chart plots, most recent 10 sessions.
function getVolumeSeries(exerciseId, workouts, unit) {
  const rows = [];
  Object.entries(workouts).forEach(([dateKey, w]) => {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) return;
    let volume = 0;
    entry.sets.forEach((s) => {
      const wConv = convertWeight(s.weight, s.unit, unit);
      const wNum = wConv === "" ? 0 : wConv;
      const reps = parseFloat(s.reps) || 0;
      volume += wNum * reps;
    });
    rows.push({ dateKey, volume });
  });
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

// Cardio equivalent: total distance (time × speed) per session, most recent
// 10 sessions — the closest thing cardio has to "volume".
function getCardioDistanceSeries(exerciseId, workouts, unit) {
  const rows = [];
  Object.entries(workouts).forEach(([dateKey, w]) => {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) return;
    let distance = 0;
    entry.sets.forEach((s) => {
      const speedConv = convertSpeed(s.speed, s.unit, unit);
      const speedNum = speedConv === "" ? 0 : speedConv;
      const timeMin = parseFloat(s.time) || 0;
      distance += (timeMin / 60) * speedNum;
    });
    rows.push({ dateKey, volume: distance });
  });
  rows.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return rows.slice(-10);
}

/* ------------------------------------------------------------------ */
/* Small primitives                                                     */
/* ------------------------------------------------------------------ */
function IconBtn({ onClick, children, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 flex items-center justify-center active:opacity-40 transition -ml-1"
      style={{ color: "var(--text)" }}
    >
      {children}
    </button>
  );
}

function ColorSwitch({ value, options, onChange }) {
  return (
    <div className="flex items-center p-0.5 rounded-full" style={{ background: "var(--surface)", border: "1.5px solid var(--line-strong)" }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className="display text-[14px] uppercase px-3 py-1 rounded-full transition"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#121214" : "var(--text-dim)",
              fontWeight: active ? 700 : 500,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FAB({ onClick, label }) {
  // Nav height is deterministic: 1rem top padding + 20px content row +
  // max(1rem, safe-area) bottom padding. FAB sits exactly 1.25rem above
  // that — the same distance it sits from the side of the screen.
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center active:scale-95 transition"
      style={{
        position: "fixed",
        right: "max(1.25rem, calc(50vw - 210px + 1.25rem))",
        bottom: "calc(56px + max(16px, env(safe-area-inset-bottom)))",
        width: 48,
        height: 48,
        borderRadius: 999,
        border: "2px solid rgba(0,0,0,0.3)",
        background: "var(--accent)",
        color: "#121214",
        boxShadow: "3px 3px 0 rgba(0,0,0,0.35)",
        zIndex: 25,
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1, fontWeight: 500 }}>+</span>
    </button>
  );
}

function CategoryFilterChips({ value, onChange }) {
  const options = ["All", ...CATEGORIES];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3">
      {options.map((cat) => {
        const val = cat === "All" ? "all" : cat;
        const active = value === val;
        return (
          <button
            key={cat}
            onClick={() => onChange(val)}
            className="flex-shrink-0 display text-[14px] uppercase px-3 py-1.5 rounded-full"
            style={{
              background: active ? "var(--accent)" : "var(--surface)",
              color: active ? "#121214" : "var(--text-dim)",
              fontWeight: active ? 700 : 500,
              boxShadow: active ? "none" : "inset 1px 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar view                                                        */
/* ------------------------------------------------------------------ */
function CalendarView({ monthCursor, setMonthCursor, workouts, onSelectDay }) {
  const cells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const todayKey = toKey(new Date());
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="px-5 pt-1 pb-6">
      <div className="flex items-center justify-between mb-5">
        <IconBtn label="Previous month" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>
          <ChevronLeft size={17} />
        </IconBtn>
        <h2 className="display text-[19px]" style={{ color: "var(--text)" }}>{monthLabel(monthCursor)}</h2>
        <IconBtn label="Next month" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>
          <ChevronRight size={17} />
        </IconBtn>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((w, i) => (
          <div key={i} className="text-center display text-[13px]" style={{ color: "var(--text-dim)" }}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = toKey(date);
          const workout = workouts[key];
          const setCount = workout ? workout.entries.reduce((sum, e) => sum + e.sets.length, 0) : 0;
          const isToday = key === todayKey;
          const dotOpacity = setCount === 0 ? 0 : setCount <= 3 ? 0.7 : setCount <= 8 ? 0.85 : 1;
          return (
            <button key={i} onClick={() => onSelectDay(key)} className="aspect-square flex flex-col items-center justify-center gap-1 active:opacity-50">
              <span
                className="tabular flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  fontSize: 13,
                  color: isToday ? "var(--accent)" : workout ? "var(--text)" : "var(--text-dim)",
                  fontWeight: isToday ? 700 : 400,
                  borderRadius: 6,
                  border: isToday ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                }}
              >
                {date.getDate()}
              </span>
              <span className="rounded-full" style={{ width: 4, height: 4, background: "var(--accent)", opacity: dotOpacity }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise picker (used by day view + template builder)                */
/* ------------------------------------------------------------------ */
function ExercisePicker({ exercises, exerciseView, setExerciseView, onPick, onClose, alreadyPicked = [], title = "Choose exercise", doneLabel }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const filtered = exercises.filter(
    (e) => e.name.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "all" || e.category === categoryFilter)
  );
  const grouped = CATEGORIES.map((cat) => ({ cat, items: filtered.filter((e) => e.category === cat) })).filter((g) => g.items.length);

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Close" onClick={onClose}><X size={17} /></IconBtn>
        <h3 className="display text-[19px] flex-1" style={{ color: "var(--text)" }}>{title}</h3>
        <ColorSwitch value={exerciseView} onChange={setExerciseView} options={[{ value: "grouped", label: "Group" }, { value: "flat", label: "List" }]} />
      </div>
      <div className="px-5 pt-4 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full text-[16px] outline-none py-1.5"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
      </div>
      <CategoryFilterChips value={categoryFilter} onChange={setCategoryFilter} />
      <div
        className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6"
        style={doneLabel ? { paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" } : undefined}
      >
        {exerciseView === "flat" ? (
          <ExerciseRows items={filtered} onPick={onPick} alreadyPicked={alreadyPicked} />
        ) : (
          grouped.map((g) => (
            <div key={g.cat} className="mb-5">
              <div className="display text-[13px] mb-1.5 uppercase" style={{ color: "var(--text-dim)" }}>{g.cat}</div>
              <ExerciseRows items={g.items} onPick={onPick} alreadyPicked={alreadyPicked} />
            </div>
          ))
        )}
        {filtered.length === 0 && (
          <p className="text-[13px] mt-6 text-center" style={{ color: "var(--text-dim)" }}>
            No exercises match{query ? ` "${query}"` : ""}{categoryFilter !== "all" ? ` in ${categoryFilter}` : ""}.
          </p>
        )}
      </div>

      {doneLabel && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 0,
            width: "100%",
            maxWidth: 420,
            padding: "1rem 1.25rem",
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            background: "var(--bg)",
            borderTop: "1.5px solid var(--line)",
            zIndex: 31,
          }}
        >
          <button
            onClick={onClose}
            className="w-full pill py-3 text-[14px] font-bold"
            style={{ background: "var(--accent)", color: "#121214" }}
          >
            {doneLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseRows({ items, onPick, alreadyPicked }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((ex) => {
        const picked = alreadyPicked.includes(ex.id);
        return (
          <button
            key={ex.id}
            onClick={() => onPick(ex)}
            className="relative text-left p-3"
            style={{
              background: "var(--surface)",
              borderRadius: 10,
              boxShadow: picked
                ? "inset 2px 2px 5px rgba(0,0,0,0.55), inset -1px -1px 2px rgba(255,255,255,0.04), inset 0 0 0 2px var(--accent)"
                : "inset 2px 2px 5px rgba(0,0,0,0.55), inset -1px -1px 2px rgba(255,255,255,0.04)",
              opacity: picked ? 0.7 : 1,
            }}
          >
            <div className="text-[13px] font-medium leading-snug pr-4" style={{ color: "var(--text)" }}>{ex.name}</div>
            <div className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>{ex.category}{ex.custom ? " · custom" : ""}</div>
            {picked && <Check size={13} color="var(--accent)" style={{ position: "absolute", top: 10, right: 10 }} />}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Set counters — big reps/weight steppers, plus above, minus below      */
/* ------------------------------------------------------------------ */
function Counter({ label, value, onInc, onDec, onChange, plusButtons }) {
  return (
    <div className="flex items-center gap-3 card" style={{ height: 64, paddingLeft: 8, paddingRight: 8, paddingTop: 0, paddingBottom: 0 }}>
      <button
        onClick={onDec}
        aria-label={`Decrease ${label}`}
        className="flex-shrink-0 flex items-center justify-center text-[24px] leading-none active:opacity-60"
        style={{ width: 44, height: 64, color: "var(--text-dim)" }}
      >
        −
      </button>
      <div className="flex-1 flex flex-col items-center justify-center min-w-0">
        <input
          type="number"
          step="0.5"
          min="0"
          value={value}
          onChange={onChange}
          className="w-full text-center text-[34px] font-bold tabular outline-none bg-transparent"
          style={{ color: "var(--text)", lineHeight: 1 }}
        />
        <div className="display text-[13px]" style={{ color: "var(--text-dim)", lineHeight: 1 }}>{label}</div>
      </div>
      {plusButtons ? (
        <div className="flex-shrink-0" style={{ width: 44, height: 64, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <button
            onClick={plusButtons[0].onClick}
            aria-label={`Increase ${label} by ${plusButtons[0].label}`}
            className="active:opacity-60"
            style={{
              width: 22, height: 31, padding: 0, margin: 0, border: "none", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, lineHeight: 1, color: "var(--accent)", boxSizing: "border-box",
            }}
          >
            {plusButtons[0].label}
          </button>
          <div style={{ width: 22, height: 1, background: "var(--line-strong)" }} />
          <button
            onClick={plusButtons[1].onClick}
            aria-label={`Increase ${label} by ${plusButtons[1].label}`}
            className="active:opacity-60"
            style={{
              width: 22, height: 32, padding: 0, margin: 0, border: "none", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, lineHeight: 1, color: "var(--accent)", boxSizing: "border-box",
            }}
          >
            {plusButtons[1].label}
          </button>
        </div>
      ) : (
        <button
          onClick={onInc}
          aria-label={`Increase ${label}`}
          className="flex-shrink-0 flex items-center justify-center text-[24px] leading-none active:opacity-60"
          style={{ width: 44, height: 64, color: "var(--accent)" }}
        >
          +
        </button>
      )}
    </div>
  );
}

function SetCounters({ index, set, unit, isCardio, onUpdate, onRemove }) {
  return (
    <div className="mb-4">
      <div className="display text-[14px] uppercase mb-2" style={{ color: "var(--text-dim)" }}>Set {index + 1}</div>
      <div className="flex flex-col gap-2">
        {isCardio ? <CardioFields set={set} unit={unit} onUpdate={onUpdate} /> : <StrengthFields set={set} unit={unit} onUpdate={onUpdate} />}
      </div>
      <button
        onClick={onRemove}
        className="w-full mt-2 py-2 text-[12px] font-medium text-center"
        style={{ color: "var(--text-dim)" }}
      >
        Delete set
      </button>
    </div>
  );
}

function StrengthFields({ set, unit, onUpdate }) {
  const weightStep = unit === "kg" ? 2.5 : 5;
  const reps = parseFloat(set.reps) || 0;
  const weight = convertWeight(set.weight, set.unit, unit) || 0;

  return (
    <>
      <Counter
        label={unit.toUpperCase()}
        value={weight}
        onChange={(e) => onUpdate("weight", e.target.value)}
        onInc={() => onUpdate("weight", roundHalf(weight + weightStep))}
        onDec={() => onUpdate("weight", roundHalf(Math.max(0, weight - weightStep)))}
      />
      <Counter
        label="REPS"
        value={reps}
        onChange={(e) => onUpdate("reps", e.target.value)}
        onDec={() => onUpdate("reps", roundHalf(Math.max(0, reps - 0.5)))}
        plusButtons={[
          { label: "+1", onClick: () => onUpdate("reps", roundHalf(reps + 1)) },
          { label: "+.5", onClick: () => onUpdate("reps", roundHalf(reps + 0.5)) },
        ]}
      />
    </>
  );
}

function CardioFields({ set, unit, onUpdate }) {
  const speedStep = unit === "kg" ? 1 : 0.5;
  const time = parseFloat(set.time) || 0;
  const speed = convertSpeed(set.speed, set.unit, unit) || 0;
  const speedLabel = unit === "kg" ? "KM/H" : "MPH";

  return (
    <>
      <Counter
        label="MIN"
        value={time}
        onChange={(e) => onUpdate("time", e.target.value)}
        onDec={() => onUpdate("time", roundHalf(Math.max(0, time - 1)))}
        plusButtons={[
          { label: "+5", onClick: () => onUpdate("time", roundHalf(time + 5)) },
          { label: "+1", onClick: () => onUpdate("time", roundHalf(time + 1)) },
        ]}
      />
      <Counter
        label={speedLabel}
        value={speed}
        onChange={(e) => onUpdate("speed", e.target.value)}
        onInc={() => onUpdate("speed", roundHalf(speed + speedStep))}
        onDec={() => onUpdate("speed", roundHalf(Math.max(0, speed - speedStep)))}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Day / workout log view                                               */
/* ------------------------------------------------------------------ */
function DayView({
  dateKey, workout, exercises, templates, unit, workouts,
  onBack, onRename, onAddExercise, onRemoveExercise, onSwapExercise,
  onAddSet, onUpdateSet, onRemoveSet, onApplyTemplate, onOpenHistory, onSaveAsTemplate,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [swapExId, setSwapExId] = useState(null);
  const [openExerciseId, setOpenExerciseId] = useState(null);
  const entries = workout ? workout.entries : [];
  const usedTemplate = (workout?.templateIds || []).length > 0;
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <div className="flex-1">
          <input
            value={workout ? workout.name : "Workout"}
            onChange={(e) => onRename(e.target.value)}
            className="bg-transparent outline-none text-[16px] font-semibold w-full"
            style={{ color: "var(--text)" }}
          />
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>{dayLabel(dateKey)}</div>
        </div>
        {entries.length > 0 && !usedTemplate && (
          <button
            onClick={() => setShowSaveTemplate(true)}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
          >
            Save as template
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3" style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
        {entries.length === 0 && (
          <p className="text-[12px] py-3" style={{ color: "var(--text-dim)" }}>
            Tap "+ Add exercise" below, or "Load template" to get started.
          </p>
        )}
        {entries.map((entry) => {
          const ex = exMap[entry.exerciseId];
          if (!ex) return null;
          const isCardio = ex.category === "Cardio";
          const isOpen = openExerciseId === entry.exerciseId;
          const lastSet = entry.sets[entry.sets.length - 1];
          const { repLow, repHigh } = getRepRange(entry.exerciseId, workouts, dateKey);
          const rec = !isCardio && entry.sets.length === 0 ? getRecommendation(entry.exerciseId, workouts, unit, dateKey, repLow, repHigh) : null;
          const speedLabel = unit === "kg" ? "km/h" : "mph";
          // Tapping "Add set" always does the sensible thing: repeat your last
          // set's numbers if you've already logged one today, otherwise start
          // from the suggested weight/reps if we have history (strength only),
          // otherwise blank.
          const prefill = isCardio
            ? lastSet
              ? { time: lastSet.time, speed: convertSpeed(lastSet.speed, lastSet.unit, unit) }
              : null
            : lastSet
            ? { reps: lastSet.reps, weight: convertWeight(lastSet.weight, lastSet.unit, unit) }
            : rec
            ? { reps: rec.recReps, weight: rec.recWeight }
            : null;

          return (
            <div key={entry.exerciseId} className="py-4" style={{ borderBottom: "1.5px solid var(--line)" }}>
              <div
                onClick={() => setOpenExerciseId((cur) => (cur === entry.exerciseId ? null : entry.exerciseId))}
                className="flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight
                    size={15}
                    color="var(--text-dim)"
                    style={{ flexShrink: 0, transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                  />
                  <span className="text-[14px] font-medium truncate" style={{ color: "var(--text)" }}>{ex.name}</span>
                  {!isOpen && entry.sets.length > 0 && (
                    <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-dim)" }}>
                      · {entry.sets.length} set{entry.sets.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenHistory(entry.exerciseId); }}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-center"
                    style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
                  >
                    History
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSwapExId(entry.exerciseId); }}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-center"
                    style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
                  >
                    Swap
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveExercise(entry.exerciseId); }}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-center"
                    style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3">
                  {entry.sets.length === 0 && rec && (
                    <div className="text-[11px] mb-3" style={{ color: "var(--text-dim)" }}>
                      Last: {fmtNum(rec.lastWeight)} {unit} × {fmtNum(rec.lastReps)} · {rec.note}
                    </div>
                  )}

                  {entry.sets.map((set, i) => (
                    <SetCounters
                      key={set.id}
                      index={i}
                      set={set}
                      unit={unit}
                      isCardio={isCardio}
                      onUpdate={(field, value) => onUpdateSet(entry.exerciseId, set.id, field, value)}
                      onRemove={() => onRemoveSet(entry.exerciseId, set.id)}
                    />
                  ))}

                  <button
                    onClick={() => onAddSet(entry.exerciseId, prefill || undefined)}
                    className="w-full mt-2 py-2.5 rounded-full text-[13px] font-semibold text-center"
                    style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
                  >
                    {entry.sets.length === 0 && prefill
                      ? isCardio
                        ? `+ Add set · ${fmtNum(prefill.time)} min @ ${fmtNum(prefill.speed)} ${speedLabel}`
                        : `+ Add set · ${fmtNum(prefill.reps)} × ${fmtNum(prefill.weight)} ${unit}`
                      : "+ Add set"}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setShowPicker(true)}
          className="w-full mt-2 py-2.5 rounded-lg text-[13px] font-semibold text-center"
          style={{ color: "var(--accent)", border: "1.5px dashed var(--line-strong)" }}
        >
          + Add exercise
        </button>
      </div>

      <button
        onClick={() => setShowTemplates(true)}
        className="pill px-4 py-3 text-[13px] font-bold"
        style={{
          position: "fixed",
          right: "max(1.25rem, calc(50vw - 210px + 1.25rem))",
          bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          background: "var(--accent)",
          color: "#121214",
          zIndex: 25,
        }}
      >
        Load template
      </button>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={entries.map((e) => e.exerciseId)}
          onPick={(ex) => { onAddExercise(ex.id); setOpenExerciseId(ex.id); }}
          onClose={() => setShowPicker(false)}
          doneLabel="Add"
        />
      )}

      {swapExId && (
        <ExercisePicker
          title="Swap exercise"
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={entries.map((e) => e.exerciseId).filter((id) => id !== swapExId)}
          onPick={(ex) => { onSwapExercise(swapExId, ex.id); setSwapExId(null); }}
          onClose={() => setSwapExId(null)}
        />
      )}

      {showSaveTemplate && (
        <SaveAsTemplateModal
          onClose={() => setShowSaveTemplate(false)}
          onSave={(name) => { onSaveAsTemplate(dateKey, name); setShowSaveTemplate(false); }}
        />
      )}

      {showTemplates && (
        <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg)" }}>
          <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
            <IconBtn label="Close" onClick={() => setShowTemplates(false)}><X size={17} /></IconBtn>
            <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>Pull in a template</h3>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 flex flex-col gap-2">
            {templates.length === 0 && (
              <p className="text-[13px]" style={{ color: "var(--text-dim)" }}>
                No templates yet — close this and add exercises directly, or build a template from the Templates tab.
              </p>
            )}
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => { onApplyTemplate(t.id); setShowTemplates(false); }}
                className="w-full text-left card p-4"
              >
                <div className="text-[14px] font-medium" style={{ color: "var(--text)" }}>{t.name}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-dim)" }}>{t.exerciseIds.length} exercises</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise library view                                                */
/* ------------------------------------------------------------------ */
function ExerciseTile({ ex, onOpen, onDelete }) {
  return (
    <div className="relative card p-3">
      <button onClick={() => onOpen(ex.id)} className="text-left w-full">
        <div className="text-[13px] font-medium leading-snug pr-4" style={{ color: "var(--text)" }}>{ex.name}</div>
        <div className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>{ex.category}{ex.custom ? " · custom" : ""}</div>
      </button>
      {ex.custom && (
        <button onClick={() => onDelete(ex.id)} aria-label="Delete custom exercise" className="absolute" style={{ top: 8, right: 8 }}>
          <Trash2 size={12} color="var(--text-dim)" />
        </button>
      )}
    </div>
  );
}

function ExerciseListRow({ ex, onOpen, onDelete }) {
  return (
    <div className="card p-3 flex items-center justify-between gap-3">
      <button onClick={() => onOpen(ex.id)} className="text-left flex-1 min-w-0">
        <div className="text-[13px] font-medium leading-snug" style={{ color: "var(--text)" }}>{ex.name}</div>
        <div className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>{ex.category}{ex.custom ? " · custom" : ""}</div>
      </button>
      {ex.custom && (
        <button onClick={() => onDelete(ex.id)} aria-label="Delete custom exercise" className="flex-shrink-0">
          <Trash2 size={13} color="var(--text-dim)" />
        </button>
      )}
    </div>
  );
}

function ExercisesView({ exercises, exerciseView, setExerciseView, onOpenHistory, onAddCustom, onDeleteExercise }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = exercises.filter(
    (e) => e.name.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "all" || e.category === categoryFilter)
  );
  const grouped = CATEGORIES.map((cat) => ({ cat, items: filtered.filter((e) => e.category === cat) })).filter((g) => g.items.length);

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <h2 className="display text-[19px]" style={{ color: "var(--text)" }}>Exercises</h2>
        <ColorSwitch value={exerciseView} onChange={setExerciseView} options={[{ value: "grouped", label: "Group" }, { value: "flat", label: "List" }]} />
      </div>
      <div className="px-5 pb-3">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search"
          className="w-full text-[16px] outline-none py-1.5"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
      </div>
      <CategoryFilterChips value={categoryFilter} onChange={setCategoryFilter} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5" style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
        {exerciseView === "flat" ? (
          <div className="flex flex-col gap-2">
            {filtered.map((ex) => (
              <ExerciseListRow key={ex.id} ex={ex} onOpen={onOpenHistory} onDelete={onDeleteExercise} />
            ))}
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.cat} className="mb-5">
              <div className="display text-[13px] mb-1.5 uppercase" style={{ color: "var(--text-dim)" }}>{g.cat}</div>
              <div className="grid grid-cols-2 gap-2">
                {g.items.map((ex) => (
                  <ExerciseTile key={ex.id} ex={ex} onOpen={onOpenHistory} onDelete={onDeleteExercise} />
                ))}
              </div>
            </div>
          ))
        )}
        {filtered.length === 0 && (
          <p className="text-[13px] mt-6 text-center" style={{ color: "var(--text-dim)" }}>
            No exercises match{query ? ` "${query}"` : ""}{categoryFilter !== "all" ? ` in ${categoryFilter}` : ""}.
          </p>
        )}
      </div>

      <FAB label="Add custom exercise" onClick={() => setShowAdd(true)} />

      {showAdd && (
        <AddCustomExerciseModal
          onClose={() => setShowAdd(false)}
          onSave={(name, category) => { onAddCustom(name, category); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function AddCustomExerciseModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="w-full p-5" style={{ background: "var(--bg)", borderTop: "1.5px solid var(--line)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <h3 className="display text-[19px] mb-4" style={{ color: "var(--text)" }}>New exercise</h3>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" autoFocus
          className="w-full text-[16px] outline-none py-1.5 mb-4"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c} onClick={() => setCategory(c)}
              className="text-[13px]"
              style={{
                color: category === c ? "var(--text)" : "var(--text-dim)",
                fontWeight: category === c ? 600 : 400,
                textDecoration: category === c ? "underline" : "none",
                textUnderlineOffset: "3px",
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-[13px]" style={{ color: "var(--text-dim)" }}>Cancel</button>
          <button
            onClick={() => name.trim() && onSave(name.trim(), category)}
            className="text-[13px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveAsTemplateModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="w-full p-5" style={{ background: "var(--bg)", borderTop: "1.5px solid var(--line)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <h3 className="display text-[19px] mb-1" style={{ color: "var(--text)" }}>Save as template</h3>
        <p className="text-[12px] mb-4" style={{ color: "var(--text-dim)" }}>Saves today's exercise list so you can pull it into any workout later.</p>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name (e.g. Push Day)" autoFocus
          className="w-full text-[16px] outline-none py-1.5 mb-4"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-[13px]" style={{ color: "var(--text-dim)" }}>Cancel</button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            className="text-[13px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Templates view                                                        */
/* ------------------------------------------------------------------ */
function TemplatesView({ templates, exercises, onCreate, onDelete, onOpenTemplate }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-5 pt-1 pb-3">
        <h2 className="display text-[19px]" style={{ color: "var(--text)" }}>Templates</h2>
        <p className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>
          A template is a saved list of exercises — like "Push Day" or "Leg Day" — that you can pull into any workout in one tap instead of re-adding each exercise by hand.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 flex flex-col gap-2" style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
        {templates.length === 0 && (
          <p className="text-[13px] text-center mt-10" style={{ color: "var(--text-dim)" }}>
            No templates yet. Tap + to build one.
          </p>
        )}
        {templates.map((t) => (
          <button key={t.id} onClick={() => onOpenTemplate(t.id)} className="text-left card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[14px] font-medium" style={{ color: "var(--text)" }}>{t.name}</span>
              <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} aria-label="Delete template"><Trash2 size={14} color="var(--text-dim)" /></button>
            </div>
            <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
              {t.exerciseIds.map((id) => exMap[id]?.name).filter(Boolean).join(" · ")}
            </div>
          </button>
        ))}
      </div>

      <FAB label="New template" onClick={() => setShowBuilder(true)} />

      {showBuilder && (
        <TemplateBuilder
          exercises={exercises}
          onClose={() => setShowBuilder(false)}
          onSave={(name, ids) => { onCreate(name, ids); setShowBuilder(false); }}
        />
      )}
    </div>
  );
}

function TemplateBuilder({ exercises, onClose, onSave }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [exerciseView, setExerciseView] = useState("grouped");
  const [showPicker, setShowPicker] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Close" onClick={onClose}><X size={17} /></IconBtn>
        <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>New template</h3>
      </div>
      <div className="px-5 pt-4">
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name (e.g. Push Day)"
          className="w-full text-[16px] outline-none py-1.5 mb-2"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-2 flex flex-col gap-2">
        {picked.map((id) => (
          <div key={id} className="flex items-center justify-between card p-3">
            <span className="text-[14px]" style={{ color: "var(--text)" }}>{exMap[id]?.name}</span>
            <button onClick={() => setPicked(picked.filter((p) => p !== id))} aria-label="Remove from template"><X size={14} color="var(--text-dim)" /></button>
          </div>
        ))}
        {picked.length === 0 && (
          <p className="text-[13px] text-center mt-4" style={{ color: "var(--text-dim)" }}>No exercises added yet.</p>
        )}
      </div>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: "1.5px solid var(--line)" }}>
        <button onClick={() => setShowPicker(true)} className="text-[13px] font-medium" style={{ color: "var(--text-dim)" }}>
          + Add exercise
        </button>
        <button
          onClick={() => name.trim() && picked.length > 0 && onSave(name.trim(), picked)}
          className="text-[13px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Save template
        </button>
      </div>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          exerciseView={exerciseView}
          setExerciseView={setExerciseView}
          alreadyPicked={picked}
          onPick={(ex) => setPicked((p) => (p.includes(ex.id) ? p : [...p, ex.id]))}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Template detail — exercise list + recent days it was used             */
/* ------------------------------------------------------------------ */
function TemplateDetailView({ template, exercises, workouts, onBack, onDelete, onSelectDate, onAddExercise, onRemoveExercise }) {
  const [showPicker, setShowPicker] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  const usedDates = useMemo(() => {
    return Object.entries(workouts)
      .filter(([, w]) => (w.templateIds || []).includes(template.id))
      .map(([dateKey]) => dateKey)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 5);
  }, [workouts, template]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <h3 className="display text-[19px] flex-1" style={{ color: "var(--text)" }}>{template.name}</h3>
        <button onClick={() => onDelete(template.id)} aria-label="Delete template"><Trash2 size={16} color="var(--text-dim)" /></button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="display text-[13px] uppercase" style={{ color: "var(--text-dim)" }}>Exercises</div>
          <button onClick={() => setShowPicker(true)} className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>
            + Add exercise
          </button>
        </div>
        {template.exerciseIds.length === 0 ? (
          <p className="text-[13px] mb-6" style={{ color: "var(--text-dim)" }}>No exercises yet — tap "Add exercise" above.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {template.exerciseIds.map((id) => exMap[id]).filter(Boolean).map((ex) => (
              <div key={ex.id} className="card p-3 relative">
                <div className="text-[13px] font-medium leading-snug pr-4" style={{ color: "var(--text)" }}>{ex.name}</div>
                <div className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>{ex.category}</div>
                <button
                  onClick={() => onRemoveExercise(template.id, ex.id)}
                  aria-label={`Remove ${ex.name} from template`}
                  className="absolute"
                  style={{ top: 8, right: 8 }}
                >
                  <X size={13} color="var(--text-dim)" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="display text-[13px] mb-2 uppercase" style={{ color: "var(--text-dim)" }}>Recent uses</div>
        {usedDates.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-dim)" }}>Not used yet — pull it into a workout day to get started.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {usedDates.map((dateKey) => (
              <button key={dateKey} onClick={() => onSelectDate(dateKey)} className="text-left card p-3">
                <span className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{shortDayLabel(dateKey)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <ExercisePicker
          title="Add to template"
          exercises={exercises}
          exerciseView="grouped"
          setExerciseView={() => {}}
          alreadyPicked={template.exerciseIds}
          onPick={(ex) => onAddExercise(template.id, ex.id)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Volume chart — last 10 sessions of weight × reps for an exercise      */
/* ------------------------------------------------------------------ */
function VolumeChart({ data, unit }) {
  const W = 320, H = 130, padX = 14, padTop = 22, padBottom = 20;
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;
  const values = data.map((d) => d.volume);
  const maxV = Math.max(...values);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? padX + plotW / 2 : padX + (i / (data.length - 1)) * plotW;
    const y = padTop + (1 - (d.volume - minV) / range) * plotH;
    return { ...d, x, y };
  });
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const fmtVolume = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : fmtNum(Math.round(v)));
  const fmtShortDate = (dateKey) => {
    const [, m, d] = dateKey.split("-").map(Number);
    return `${m}/${d}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="tabular">
      <line x1={padX} y1={padTop + plotH} x2={W - padX} y2={padTop + plotH} stroke="var(--line)" strokeWidth="1" />
      {data.length > 1 && <polyline points={linePoints} fill="none" stroke="var(--line)" strokeWidth="1.5" />}
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <g key={p.dateKey}>
            <circle cx={p.x} cy={p.y} r={isLast ? 3.5 : 2.75} fill={isLast ? "var(--accent)" : "var(--text-dim)"} />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="8" fill={isLast ? "var(--accent)" : "var(--text-dim)"}>
              {fmtVolume(p.volume)}
            </text>
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="8" fill="var(--text-dim)">
              {fmtShortDate(p.dateKey)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise history view                                                 */
/* ------------------------------------------------------------------ */
function HistoryView({ exercise, workouts, unit, onBack }) {
  const isCardio = exercise.category === "Cardio";
  const speedLabel = unit === "kg" ? "km/h" : "mph";
  const distanceLabel = unit === "kg" ? "km" : "mi";

  const records = useMemo(() => {
    const out = [];
    Object.entries(workouts).forEach(([dateKey, w]) => {
      const entry = w.entries.find((e) => e.exerciseId === exercise.id);
      if (entry && entry.sets.length) out.push({ dateKey, sets: entry.sets });
    });
    return out.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }, [workouts, exercise]);

  const volumeSeries = useMemo(
    () => (isCardio ? getCardioDistanceSeries(exercise.id, workouts, unit) : getVolumeSeries(exercise.id, workouts, unit)),
    [workouts, exercise, unit, isCardio]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
        <div>
          <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>{exercise.name}</h3>
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>{exercise.category}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3">
        {volumeSeries.length > 0 && (
          <div className="mb-5">
            <div className="display text-[13px] mb-1 uppercase" style={{ color: "var(--text-dim)" }}>
              {isCardio ? `Distance (${distanceLabel})` : "Volume"} · last {volumeSeries.length} session{volumeSeries.length > 1 ? "s" : ""}
            </div>
            <VolumeChart data={volumeSeries} unit={unit} />
          </div>
        )}
        {records.length === 0 && (
          <p className="text-[13px] text-center mt-10" style={{ color: "var(--text-dim)" }}>
            No sets logged for this exercise yet.
          </p>
        )}
        {records.map(({ dateKey, sets }) => (
          <div key={dateKey} className="py-3" style={{ borderBottom: "1.5px solid var(--line)" }}>
            <div className="text-[11px] font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>{shortDayLabel(dateKey)}</div>
            <div>
              {sets.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between text-[13px] tabular py-0.5" style={{ color: "var(--text)" }}>
                  <span className="display text-[14px] uppercase" style={{ color: "var(--text-dim)" }}>Set {i + 1}</span>
                  {isCardio ? (
                    <span>{fmtNum(parseFloat(s.time) || 0)} min @ {fmtNum(convertSpeed(s.speed, s.unit, unit))} {speedLabel}</span>
                  ) : (
                    <span>{fmtNum(parseFloat(s.reps) || 0)} reps × {fmtNum(convertWeight(s.weight, s.unit, unit))} {unit}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile view                                                          */
/* ------------------------------------------------------------------ */
function ProfileField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] mb-1" style={{ color: "var(--text-dim)" }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[16px] outline-none py-1.5"
        style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
      />
    </div>
  );
}

function ProfileView({ profile, onUpdate, onClose }) {
  const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "var(--bg)", zIndex: 50 }}>
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Close" onClick={onClose}><ArrowLeft size={17} /></IconBtn>
        <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>Profile</h3>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5">
        <div className="flex flex-col items-center mb-6">
          <div
            className="flex items-center justify-center"
            style={{ width: 84, height: 84, borderRadius: 999, background: "var(--surface)", border: "1.5px solid var(--line-strong)", overflow: "hidden" }}
          >
            {profile.pictureUrl ? (
              <img src={profile.pictureUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : initials ? (
              <span className="display text-[24px]" style={{ color: "var(--text-dim)" }}>{initials}</span>
            ) : (
              <User size={32} color="var(--text-dim)" />
            )}
          </div>
        </div>

        <ProfileField label="Profile picture URL" value={profile.pictureUrl} onChange={(v) => onUpdate("pictureUrl", v)} placeholder="https://…" />
        <ProfileField label="First name" value={profile.firstName} onChange={(v) => onUpdate("firstName", v)} />
        <ProfileField label="Last name" value={profile.lastName} onChange={(v) => onUpdate("lastName", v)} />
        <ProfileField label="Username" value={profile.username} onChange={(v) => onUpdate("username", v)} />
        <ProfileField label="Email" type="email" value={profile.email} onChange={(v) => onUpdate("email", v)} />

        <div className="mt-2">
          <div className="text-[11px] mb-1" style={{ color: "var(--text-dim)" }}>Profile ID</div>
          <div className="text-[14px] tabular" style={{ color: "var(--text-dim)" }}>{profile.profileId}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Root app                                                              */
/* ------------------------------------------------------------------ */
export default function WorkoutTrackerApp() {
  const [exercises, setExercises] = useState(SEED_EXERCISES);
  const [templates, setTemplates] = useState([]);
  const [workouts, setWorkouts] = useState({});
  const [unit, setUnit] = useState("lb");
  const [exerciseView, setExerciseView] = useState("grouped");
  const [tab, setTab] = useState("calendar");
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [historyExId, setHistoryExId] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [profile, setProfile] = useState(() => ({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    pictureUrl: "",
    profileId: `usr-${Math.random().toString(36).slice(2, 10)}`,
  }));
  const updateProfile = (field, value) => setProfile((p) => ({ ...p, [field]: value }));
  const [profileOpen, setProfileOpen] = useState(false);
  const idRef = useRef(0);
  const nextId = () => `s${Date.now()}-${idRef.current++}`;

  // Local persistence: this app has no backend yet, so it saves to the
  // browser's own storage on this device. Hydrate once on mount, then keep
  // saving on every change. `hydrated` guards against writing the initial
  // default values over real saved data before the load finishes.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const se = localStorage.getItem("barrow:exercises");
      if (se) setExercises(JSON.parse(se));
      const st = localStorage.getItem("barrow:templates");
      if (st) setTemplates(JSON.parse(st));
      const sw = localStorage.getItem("barrow:workouts");
      if (sw) setWorkouts(JSON.parse(sw));
      const su = localStorage.getItem("barrow:unit");
      if (su) setUnit(su);
      const sp = localStorage.getItem("barrow:profile");
      if (sp) setProfile(JSON.parse(sp));
    } catch (e) {
      console.error("Barrow: failed to load saved data", e);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("barrow:exercises", JSON.stringify(exercises));
    } catch (e) {
      console.error("Barrow: failed to save exercises", e);
    }
  }, [exercises, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("barrow:templates", JSON.stringify(templates));
    } catch (e) {
      console.error("Barrow: failed to save templates", e);
    }
  }, [templates, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("barrow:workouts", JSON.stringify(workouts));
    } catch (e) {
      console.error("Barrow: failed to save workouts", e);
    }
  }, [workouts, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("barrow:unit", unit);
    } catch (e) {
      console.error("Barrow: failed to save unit", e);
    }
  }, [unit, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("barrow:profile", JSON.stringify(profile));
    } catch (e) {
      console.error("Barrow: failed to save profile", e);
    }
  }, [profile, hydrated]);

  // History and day view take over the whole screen; template detail sits
  // "under" a day view so returning from a day drops back into it.
  const view = historyExId ? "history" : selectedDate ? "day" : selectedTemplateId ? "templateDetail" : tab;
  const showChrome = view !== "day" && view !== "history" && view !== "templateDetail";

  const ensureWorkout = (dateKey, updater) => {
    setWorkouts((prev) => {
      const current = prev[dateKey] || { name: "Workout", entries: [], templateIds: [] };
      return { ...prev, [dateKey]: updater(current) };
    });
  };

  const handlers = {
    onRename: (name) => ensureWorkout(selectedDate, (w) => ({ ...w, name })),
    onAddExercise: (exId) =>
      ensureWorkout(selectedDate, (w) =>
        w.entries.some((e) => e.exerciseId === exId)
          ? w
          : { ...w, entries: [...w.entries, { exerciseId: exId, sets: [] }] }
      ),
    onRemoveExercise: (exId) =>
      ensureWorkout(selectedDate, (w) => ({ ...w, entries: w.entries.filter((e) => e.exerciseId !== exId) })),
    // Swaps one exercise for another on this day only — the template (and
    // any other day that used it) is untouched. New exercise starts fresh.
    onSwapExercise: (oldExId, newExId) =>
      ensureWorkout(selectedDate, (w) => {
        if (oldExId === newExId) return w;
        const alreadyUsed = w.entries.some((e) => e.exerciseId === newExId);
        if (alreadyUsed) return w;
        return { ...w, entries: w.entries.map((e) => (e.exerciseId === oldExId ? { exerciseId: newExId, sets: [] } : e)) };
      }),
    onAddSet: (exId, preset) =>
      ensureWorkout(selectedDate, (w) => ({
        ...w,
        entries: w.entries.map((e) =>
          e.exerciseId === exId
            ? {
                ...e,
                sets: [
                  ...e.sets,
                  {
                    id: nextId(),
                    reps: preset?.reps ?? "",
                    weight: preset?.weight ?? "",
                    time: preset?.time ?? "",
                    speed: preset?.speed ?? "",
                    unit,
                  },
                ],
              }
            : e
        ),
      })),
    onUpdateSet: (exId, setId, field, value) =>
      ensureWorkout(selectedDate, (w) => ({
        ...w,
        entries: w.entries.map((e) =>
          e.exerciseId === exId
            ? {
                ...e,
                sets: e.sets.map((s) =>
                  s.id === setId
                    ? field === "weight" || field === "speed"
                      ? { ...s, [field]: value, unit }
                      : { ...s, [field]: value }
                    : s
                ),
              }
            : e
        ),
      })),
    onRemoveSet: (exId, setId) =>
      ensureWorkout(selectedDate, (w) => ({
        ...w,
        entries: w.entries.map((e) => (e.exerciseId === exId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e)),
      })),
    onApplyTemplate: (tplId) => {
      const tpl = templates.find((t) => t.id === tplId);
      if (!tpl) return;
      ensureWorkout(selectedDate, (w) => {
        const existingIds = new Set(w.entries.map((e) => e.exerciseId));
        const newEntries = tpl.exerciseIds.filter((id) => !existingIds.has(id)).map((id) => ({ exerciseId: id, sets: [] }));
        const templateIds = (w.templateIds || []).includes(tplId) ? w.templateIds : [...(w.templateIds || []), tplId];
        return { ...w, entries: [...w.entries, ...newEntries], templateIds };
      });
    },
  };

  const addCustomExercise = (name, category) => {
    const id = `custom-${slug(name)}-${Date.now()}`;
    setExercises((prev) => [...prev, { id, name, category, custom: true }]);
  };
  const deleteExercise = (id) => setExercises((prev) => prev.filter((e) => e.id !== id));

  const createTemplate = (name, exerciseIds) => {
    setTemplates((prev) => [...prev, { id: `tpl-${Date.now()}`, name, exerciseIds }]);
  };
  // Turns a day's already-logged exercises into a reusable template — only
  // relevant when that day wasn't built from a template in the first place.
  const saveWorkoutAsTemplate = (dateKey, name) => {
    const workout = workouts[dateKey];
    if (!workout || workout.entries.length === 0) return;
    const newTplId = `tpl-${Date.now()}`;
    setTemplates((prev) => [...prev, { id: newTplId, name, exerciseIds: workout.entries.map((e) => e.exerciseId) }]);
    setWorkouts((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], templateIds: [...(prev[dateKey].templateIds || []), newTplId] },
    }));
  };
  const deleteTemplate = (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setSelectedTemplateId((cur) => (cur === id ? null : cur));
  };
  const addExerciseToTemplate = (templateId, exId) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId && !t.exerciseIds.includes(exId) ? { ...t, exerciseIds: [...t.exerciseIds, exId] } : t))
    );
  const removeExerciseFromTemplate = (templateId, exId) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, exerciseIds: t.exerciseIds.filter((id) => id !== exId) } : t))
    );

  const TABS = [
    { id: "calendar", label: "Calendar" },
    { id: "exercises", label: "Exercises" },
    { id: "templates", label: "Templates" },
  ];

  return (
    <div className="w-full flex justify-center font" style={{ background: "var(--bg)", height: "100dvh" }}>
      <div className="relative w-full max-w-[420px] h-full flex flex-col">
        {showChrome && (
          <div className="flex items-center justify-between px-5" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))", paddingBottom: "1rem" }}>
            <span className="display text-[22px]" style={{ color: "var(--text)" }}>BARROW</span>
            <div className="flex items-center gap-2.5">
              <ColorSwitch value={unit} onChange={setUnit} options={[{ value: "lb", label: "LB" }, { value: "kg", label: "KG" }]} />
              <button
                onClick={() => setProfileOpen(true)}
                aria-label="Profile"
                className="flex-shrink-0 flex items-center justify-center active:opacity-60"
                style={{ width: 32, height: 32, borderRadius: 999, background: "var(--surface)", border: "1.5px solid var(--line-strong)", overflow: "hidden" }}
              >
                {profile.pictureUrl ? (
                  <img src={profile.pictureUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <User size={16} color="var(--text-dim)" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 relative">
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
              onAddCustom={addCustomExercise}
              onDeleteExercise={deleteExercise}
            />
          )}

          {view === "templates" && (
            <TemplatesView
              templates={templates}
              exercises={exercises}
              onCreate={createTemplate}
              onDelete={deleteTemplate}
              onOpenTemplate={setSelectedTemplateId}
            />
          )}

          {view === "templateDetail" && (
            <TemplateDetailView
              template={templates.find((t) => t.id === selectedTemplateId)}
              exercises={exercises}
              workouts={workouts}
              onBack={() => setSelectedTemplateId(null)}
              onDelete={deleteTemplate}
              onSelectDate={(dateKey) => setSelectedDate(dateKey)}
              onAddExercise={addExerciseToTemplate}
              onRemoveExercise={removeExerciseFromTemplate}
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
              onSaveAsTemplate={saveWorkoutAsTemplate}
              {...handlers}
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

        {showChrome && tab === "calendar" && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "calc(56px + max(16px, env(safe-area-inset-bottom)))",
              width: "100%",
              maxWidth: 420,
              padding: "0 1.25rem",
              zIndex: 25,
            }}
          >
            <button
              onClick={() => setSelectedDate(toKey(new Date()))}
              className="w-full pill py-3 text-[14px] font-bold"
              style={{ background: "var(--accent)", color: "#121214" }}
            >
              Start a workout
            </button>
          </div>
        )}

        {showChrome && (
          <div
            className="flex items-center justify-around"
            style={{
              position: "fixed",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: 0,
              width: "100%",
              maxWidth: 420,
              background: "var(--bg)",
              borderTop: "1.5px solid var(--line)",
              paddingTop: "1rem",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              zIndex: 30,
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="display text-[13px] uppercase px-2"
                  style={{ height: 20, lineHeight: "20px", color: active ? "var(--text)" : "var(--text-dim)", fontWeight: active ? 600 : 400 }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {profileOpen && (
          <ProfileView profile={profile} onUpdate={updateProfile} onClose={() => setProfileOpen(false)} />
        )}
      </div>
    </div>
  );
}
