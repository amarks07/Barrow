const LB_PER_KG = 2.20462;
const KMH_PER_MPH = 1.60934;

export const roundHalf = (n) => Math.round(n * 2) / 2;

export function convertWeight(value, fromUnit, toUnit) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  if (!fromUnit || fromUnit === toUnit) return num;
  const converted = fromUnit === "kg" ? num * LB_PER_KG : num / LB_PER_KG;
  return roundHalf(converted);
}

// Cardio speed reuses the same lb/kg toggle as an imperial/metric preference:
// "lb" system displays mph, "kg" system displays km/h.
export function convertSpeed(value, fromUnit, toUnit) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  if (!fromUnit || fromUnit === toUnit) return num;
  const converted = fromUnit === "kg" ? num * KMH_PER_MPH : num / KMH_PER_MPH;
  return roundHalf(converted);
}

export const fmtNum = (n) => {
  if (n === "" || n === null || n === undefined || Number.isNaN(n)) return "–";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
