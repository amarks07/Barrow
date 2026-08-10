import { useEffect, useMemo } from "react";
import { WheelPickerRow } from "../ui/WheelPickerRow";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();
// Oldest first — lower years toward the top of the dial, higher years
// (down to "today") toward the bottom.
const YEARS = Array.from({ length: 120 }, (_, i) => CURRENT_YEAR - 119 + i);

// `month` here is 1-based (1=Jan). Passing it straight into Date's 0-based
// month slot with day 0 lands on the last day of the *previous* 0-based
// month, which is the last day of our 1-based `month` — the standard
// days-in-month trick.
function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function parseBirthday(value) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return { year, month, day };
  }
  // Nothing picked yet — open the dials on a plausible birthday (25 years
  // ago) instead of the Unix epoch.
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 25);
  return { year: fallback.getFullYear(), month: fallback.getMonth() + 1, day: fallback.getDate() };
}

function formatBirthday({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// For PickerField's read-only row — "" (not the fallback date) when nothing
// has actually been picked yet.
export function formatBirthdayDisplay(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const { year, month, day } = parseBirthday(value);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

// Three vertically scrolling dials (month/day/year) that together edit a
// single "YYYY-MM-DD" string, mirroring how the Height field pairs two
// dials (feet/inches) into one stored value.
export function BirthdayPicker({ value, onChange }) {
  const { year, month, day } = parseBirthday(value);

  const dayCount = daysInMonth(month, year);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  // Commits the fallback date on first mount so the stored value always
  // matches what the dials are actually showing, rather than staying ""
  // until the user nudges one of them.
  useEffect(() => {
    if (!value) onChange(formatBirthday({ year, month, day }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next) => {
    const merged = { year, month, day, ...next };
    // Clamp the day when switching to a shorter month/year (e.g. Jan 31 ->
    // Feb) so the resulting date is always valid instead of overflowing.
    merged.day = Math.min(merged.day, daysInMonth(merged.month, merged.year));
    onChange(formatBirthday(merged));
  };

  return (
    <WheelPickerRow
      columns={[
        {
          items: MONTHS.map((label) => ({ label })),
          selectedIndex: month - 1,
          onChange: (i) => update({ month: i + 1 }),
          width: 64,
        },
        {
          items: days.map((d) => ({ label: String(d) })),
          selectedIndex: day - 1,
          onChange: (i) => update({ day: i + 1 }),
          width: 48,
          editable: true,
          valueBase: 1,
        },
        {
          items: YEARS.map((y) => ({ label: String(y) })),
          selectedIndex: YEARS.indexOf(year),
          onChange: (i) => update({ year: YEARS[i] }),
          width: 64,
          editable: true,
          valueBase: YEARS[0],
        },
      ]}
    />
  );
}
