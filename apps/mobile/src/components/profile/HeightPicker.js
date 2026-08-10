import { useEffect, useState } from "react";
import { View } from "react-native";
import { WheelPickerRow } from "../ui/WheelPickerRow";
import { ColorSwitch } from "../ui/ColorSwitch";

const FEET_RANGE = Array.from({ length: 6 }, (_, i) => i + 3); // 3'-8'
const INCHES_RANGE = Array.from({ length: 12 }, (_, i) => i); // 0"-11"
const CM_RANGE = Array.from({ length: 186 }, (_, i) => i + 90); // 90cm-275cm — same span as the feet/inches dials
const DEFAULT_TOTAL_INCHES = 66; // 5'6" — a plausible default before anything's picked

const CM_PER_INCH = 2.54;

function parseHeight(value) {
  const totalInches = value === "" || value === null || value === undefined ? DEFAULT_TOTAL_INCHES : parseFloat(value) || 0;
  const feet = Math.min(8, Math.max(3, Math.floor(totalInches / 12)));
  const inches = Math.min(11, Math.max(0, Math.round(totalInches - Math.floor(totalInches / 12) * 12)));
  const cm = Math.min(CM_RANGE[CM_RANGE.length - 1], Math.max(CM_RANGE[0], Math.round(totalInches * CM_PER_INCH)));
  return { feet, inches, cm };
}

// For PickerField's read-only row — "" (not the fallback height) when
// nothing has actually been picked yet.
export function formatHeightDisplay(value) {
  if (value === "" || value === null || value === undefined) return "";
  const totalInches = parseFloat(value);
  if (Number.isNaN(totalInches)) return "";
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return `${feet}' ${inches}"`;
}

// Stored (and synced) as a single total-inches number regardless of which
// unit was used to enter it, but edited via a unit toggle: a feet/inches
// dial pair (matches how a person actually thinks about height, mirrors
// BirthdayPicker's month/day/year split) or a single centimeters dial for
// users who think metric. The toggle is entry-mode only, not a persisted
// preference — it always opens back on feet/inches, converted from whatever
// is stored.
export function HeightPicker({ value, onChange }) {
  const [unit, setUnit] = useState("ft");
  const { feet, inches, cm } = parseHeight(value);

  useEffect(() => {
    if (!value) onChange(String(DEFAULT_TOTAL_INCHES));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFeetInches = (nextFeet, nextInches) => onChange(String(nextFeet * 12 + nextInches));
  const updateCm = (nextCm) => onChange(String(Math.round(nextCm / CM_PER_INCH)));

  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <ColorSwitch
        value={unit}
        onChange={setUnit}
        options={[
          { value: "ft", label: "FT/IN" },
          { value: "cm", label: "CM" },
        ]}
      />
      {unit === "ft" ? (
        <WheelPickerRow
          columns={[
            {
              items: FEET_RANGE.map((f) => ({ label: `${f}'` })),
              selectedIndex: FEET_RANGE.indexOf(feet),
              onChange: (i) => updateFeetInches(FEET_RANGE[i], inches),
              width: 56,
              editable: true,
              valueBase: FEET_RANGE[0],
            },
            {
              items: INCHES_RANGE.map((n) => ({ label: `${n}"` })),
              selectedIndex: inches,
              onChange: (i) => updateFeetInches(feet, INCHES_RANGE[i]),
              width: 56,
              editable: true,
              valueBase: INCHES_RANGE[0],
            },
          ]}
        />
      ) : (
        <WheelPickerRow
          columns={[
            {
              items: CM_RANGE.map((c) => ({ label: `${c} cm` })),
              selectedIndex: CM_RANGE.indexOf(cm),
              onChange: (i) => updateCm(CM_RANGE[i]),
              width: 72,
              editable: true,
              valueBase: CM_RANGE[0],
            },
          ]}
        />
      )}
    </View>
  );
}
