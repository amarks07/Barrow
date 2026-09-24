import { Text, View } from "react-native";
import { Button } from "../ui/Button";
import { ConfirmDeleteButton } from "../ui/ConfirmDeleteButton";
import { FieldsRow } from "./FieldsRow";
import { SplitRepsRow } from "./SplitRepsRow";
import { SideToggle } from "./SideToggle";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function SetCounters({ fields, sets, set, unit, plateCalculatorEnabled, onUpdate, onRemove, autoFocusField }) {
  const { tokens } = useTheme();

  // Numbered within its own type (warmup vs working) rather than by raw
  // position in the exercise's set list — so toggling an earlier set's
  // warmup flag renumbers the working sets after it instead of leaving a
  // gap, and vice versa.
  const sameTypeSets = sets.filter((s) => !!s.warmup === !!set.warmup);
  const displayNumber = sameTypeSets.findIndex((s) => s.id === set.id) + 1;

  const side = set.side || "together";
  // Only a "separate" set on an exercise with reps actually changes layout
  // — weight (and every other field) always stays FieldsRow's normal
  // full-width row; only reps swaps out for SplitRepsRow's two-up row.
  const splitReps = side === "separate" && fields.includes("reps");
  const rowFields = splitReps ? fields.filter((f) => f !== "reps") : fields;

  return (
    <View
      className="mb-3 p-3 rounded-lg"
      style={{
        borderWidth: 1.5,
        borderColor: tokens.lineStrong,
        // Warmup sets get a faint light-gray wash so they read as
        // distinct from working sets at a glance.
        backgroundColor: set.warmup ? "rgba(255,255,255,0.06)" : "transparent",
      }}
    >
      <View className="flex-row items-center justify-between gap-2 mb-2">
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 14,
              textTransform: "uppercase",
              color: tokens.textDim,
            }}
          >
            {set.warmup ? "Warmup" : "Working Set"} {displayNumber}
          </Text>
        </View>
        <SideToggle value={side} onChange={(next) => onUpdate("side", next)} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          <Button label="Warmup" onPress={() => onUpdate("warmup", !set.warmup)} variant={set.warmup ? "solid" : "outline"} />
          <ConfirmDeleteButton onConfirm={onRemove} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <FieldsRow fields={rowFields} set={set} unit={unit} plateCalculatorEnabled={plateCalculatorEnabled} onUpdate={onUpdate} autoFocusField={autoFocusField} />
        {splitReps && <SplitRepsRow set={set} onUpdate={onUpdate} autoFocusField={autoFocusField} />}
      </View>
    </View>
  );
}
