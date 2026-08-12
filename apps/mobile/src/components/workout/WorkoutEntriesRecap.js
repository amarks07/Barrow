import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { exerciseMeta, formatSetLine, runInfo } from "@barrow/core";
import { Button } from "../ui/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Read-only exercise/set breakdown for one workout — extracted out of
// WorkoutSummaryView so the same rendering (superset rail, warmup badges,
// per-exercise notes) can also anchor the bottom of WorkoutStatsView without
// duplicating it.
export function WorkoutEntriesRecap({ entries, exercises, unit }) {
  const { tokens } = useTheme();
  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  // Read-only recap, so notes still stay behind a tap — nothing here shows
  // note content until its own button is pressed, same as the editor.
  const [openNotes, setOpenNotes] = useState(() => new Set());
  const toggleNote = (key) =>
    setOpenNotes((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // Group membership only counts entries that actually render — an entry
  // whose exercise was deleted from the library still occupies a slot in
  // `entries` but is skipped below, so without this a lone surviving
  // partner would still show as "grouped" with no visible other half.
  const rowRuns = useMemo(() => {
    const counts = {};
    entries.forEach((e) => {
      if (e.supersetId && exMap[e.exerciseId]) counts[e.supersetId] = (counts[e.supersetId] || 0) + 1;
    });
    return runInfo(entries, (e) => (e.supersetId && exMap[e.exerciseId] && counts[e.supersetId] >= 2 ? e.supersetId : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, exMap]);

  if (entries.length === 0) {
    return <Text style={{ fontSize: 12, color: tokens.textDim }}>No exercises logged for this workout.</Text>;
  }

  return (
    <>
      {entries.map((entry, entryIndex) => {
        const ex = exMap[entry.exerciseId];
        if (!ex) return null;
        const isSingle = ex.setFormat === "single";
        const run = rowRuns[entryIndex];

        // Fixed offset (not "50%") for the dot: this entry's total height
        // varies with how many sets it has, but the dot always marks the
        // exercise name specifically, so it stays pinned near the top
        // regardless of what's rendered below it.
        const dotOffset = 16 + 8;

        return (
          // Border lives on this same row as the rail below (not a
          // sibling reaching into padding with negative offsets), so the
          // line is guaranteed to paint on top of the border, and the
          // padding lives on the content column so the rail (no padding
          // of its own) stretches via flexbox to exactly match the
          // content's full height, including the variable-length sets
          // list — top:0/bottom:0 then land exactly on this row's real
          // edges, meeting the neighboring row's segments with no gap.
          <View key={entry.exerciseId} style={{ flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
            <View style={{ flex: 1, paddingTop: 16, paddingBottom: 16 }}>
              <View className="flex-row items-center gap-1.5">
                <Text style={{ fontSize: 14, fontWeight: "500", color: tokens.text }} numberOfLines={1}>
                  {ex.name}
                </Text>
                {ex.angles && <Text style={{ fontSize: 11, color: tokens.accent }}>· {entry.angle || ex.angles[0]}</Text>}
              </View>
              <Text style={{ fontSize: 10, color: tokens.textDim, marginBottom: 8 }} numberOfLines={1}>
                {exerciseMeta(ex)}
              </Text>

              {entry.note && (
                <View style={{ marginBottom: 8 }}>
                  <Button label="Notes" onPress={() => toggleNote(entry.exerciseId)} />
                  {openNotes.has(entry.exerciseId) && (
                    <Text style={{ fontSize: 12, color: tokens.textDim, marginTop: 8 }}>{entry.note}</Text>
                  )}
                </View>
              )}

              {ex.type === "stretch" ? (
                <View style={{ gap: 4 }}>
                  {ex.stretches.map((s) => (
                    <Text key={s.id} style={{ fontSize: 13, color: tokens.text }}>
                      {s.name} · {s.seconds}s
                    </Text>
                  ))}
                </View>
              ) : entry.sets.length === 0 ? (
                <Text style={{ fontSize: 12, color: tokens.textDim }}>No sets logged</Text>
              ) : (
                <View style={{ gap: 4 }}>
                  {entry.sets.map((set, i) => (
                    <View key={set.id} className="flex-row items-center gap-1.5">
                      <Text style={{ fontSize: 13, color: tokens.text }}>
                        {isSingle ? formatSetLine(set, ex, unit) : `Set ${i + 1} · ${formatSetLine(set, ex, unit)}`}
                      </Text>
                      {set.warmup && (
                        <View
                          className="rounded-full px-1.5 py-0.5"
                          style={{ backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
                        >
                          <Text
                            style={{
                              fontFamily: FONT_DISPLAY,
                              fontSize: 9,
                              lineHeight: 9,
                              textTransform: "uppercase",
                              includeFontPadding: false,
                              textAlignVertical: "center",
                              color: tokens.textDim,
                            }}
                          >
                            Warmup
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Always reserved at 12px wide so ungrouped and grouped rows
                still line up. */}
            <View style={{ position: "relative", width: 12 }}>
              {run.isGrouped && (
                <>
                  {!run.isFirst && (
                    <View style={{ position: "absolute", right: 3, top: 0, height: dotOffset, width: 1.5, backgroundColor: tokens.accent }} />
                  )}
                  {!run.isLast && (
                    // bottom: -1.5, not 0 — the rail is stretched to this
                    // row's content box, which sits inside the row's own
                    // border-bottom (borders live outside a flex child's
                    // stretch area), so bottom: 0 left that divider band
                    // uncovered between this row and the next one down.
                    <View style={{ position: "absolute", right: 3, top: dotOffset, bottom: -1.5, width: 1.5, backgroundColor: tokens.accent }} />
                  )}
                  <View
                    style={{
                      position: "absolute",
                      right: 0.5,
                      top: dotOffset - 3,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: tokens.accent,
                    }}
                  />
                </>
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}
