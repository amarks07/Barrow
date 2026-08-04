import { useMemo } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { buildMonthGrid, monthLabel, toKey } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
// One shared number drives both the container's actual padding and the
// cell-width math below, so the two can never drift apart the way a
// Tailwind class name and a hardcoded "matching" constant could.
const SIDE_PADDING = 20;

// Chunks the flat cell list (leading nulls for the month's start-of-week
// offset, then one entry per day) into literal 7-wide week rows.
function toWeeks(cells) {
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function CalendarGrid({ monthCursor, setMonthCursor, workouts, onSelectDay }) {
  const { tokens } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const cells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const weeks = useMemo(() => toWeeks(cells), [cells]);
  const todayKey = toKey(new Date());
  // Exact pixel cells (not flex/aspectRatio, which don't reliably resolve
  // to 7 identical squares) so every cell — and the dots inside it — lines
  // up exactly the same across the whole grid.
  const cellSize = Math.floor((windowWidth - SIDE_PADDING * 2) / 7);

  return (
    <View style={{ paddingHorizontal: SIDE_PADDING, paddingTop: 20, paddingBottom: 24 }}>
      <View className="flex-row items-center justify-between mb-5">
        <IconBtn
          label="Previous month"
          onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
        >
          <ChevronLeft size={17} color={tokens.text} />
        </IconBtn>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>{monthLabel(monthCursor)}</Text>
        <IconBtn
          label="Next month"
          onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
        >
          <ChevronRight size={17} color={tokens.text} />
        </IconBtn>
      </View>

      <View style={{ flexDirection: "row" }}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={{ width: cellSize, alignItems: "center" }}>
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: tokens.textDim }}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 8 }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={{ flexDirection: "row", marginTop: wi === 0 ? 0 : 8 }}>
            {week.map((date, di) => {
              if (!date) return <View key={di} style={{ width: cellSize, height: cellSize }} />;
              const key = toKey(date);
              const dayWorkouts = workouts[key] || [];
              // One dot per workout that day: accent for a workout with
              // logged sets, text-color for one that has exercises added
              // but no sets yet. A workout with no exercises gets no dot.
              const dots = dayWorkouts
                .map((w) => {
                  if (w.entries.some((e) => e.sets.length > 0)) return "done";
                  if (w.entries.length > 0) return "empty";
                  return null;
                })
                .filter(Boolean);
              const isToday = key === todayKey;
              return (
                // The whole cell is the tap target now, not just the
                // content hugging the number — sizing is a plain (non-
                // function) style object so it isn't at risk of the
                // function-style/Nativewind issue that broke the FAB;
                // android_ripple gives press feedback without needing a
                // style function at all.
                <Pressable
                  key={di}
                  onPress={() => onSelectDay(key)}
                  android_ripple={{ color: "rgba(255,255,255,0.15)" }}
                  style={{ width: cellSize, height: cellSize, alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1.5,
                      borderColor: isToday ? tokens.accent : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontVariant: ["tabular-nums"],
                        color: isToday ? tokens.accent : dots.length > 0 ? tokens.text : tokens.textDim,
                        fontWeight: isToday ? "700" : "400",
                      }}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                  {/* Fixed width matching the day-number box above and
                      centered within it, rather than relying on this
                      Pressable's own width to line the two up — that's
                      what let the dots drift off-center before. */}
                  <View style={{ width: 22, height: 4, flexDirection: "row", justifyContent: "center", gap: 2 }}>
                    {dots.map((status, dotIdx) => (
                      <View
                        key={dotIdx}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: status === "done" ? tokens.accent : tokens.text,
                        }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
