import { useEffect } from "react";
import { WheelPickerRow } from "../ui/WheelPickerRow";

const MIN_LB = 50;
const MAX_LB = 400;
const WHOLE_RANGE = Array.from({ length: MAX_LB - MIN_LB + 1 }, (_, i) => MIN_LB + i);
const DEFAULT_LB = 150; // a plausible default before anything's picked

function parseWeight(value) {
  const num = value === "" || value === null || value === undefined ? DEFAULT_LB : parseFloat(value) || DEFAULT_LB;
  return Math.min(MAX_LB, Math.max(MIN_LB, Math.round(num)));
}

// For PickerField's read-only row — "" (not the fallback weight) when
// nothing has actually been picked yet.
export function formatWeightDisplay(value) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  return `${Math.round(num)} lb`;
}

// Stored (and synced) as a whole-pound number, edited via a single
// whole-pounds dial. Mirrors BirthdayPicker/HeightPicker's multi-dial-into-
// one-value shape (minus the extra dial, since weight has just one field).
export function WeightPicker({ value, onChange }) {
  const whole = parseWeight(value);

  useEffect(() => {
    if (!value) onChange(String(DEFAULT_LB));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WheelPickerRow
      columns={[
        {
          items: WHOLE_RANGE.map((lb) => ({ label: String(lb) })),
          selectedIndex: WHOLE_RANGE.indexOf(whole),
          onChange: (i) => onChange(String(WHOLE_RANGE[i])),
          width: 64,
          editable: true,
          valueBase: MIN_LB,
        },
      ]}
    />
  );
}
