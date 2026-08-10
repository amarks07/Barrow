import { CounterEditModal } from "./CounterEditModal";
import { WeightToolbar } from "./WeightToolbar";

// Weight is the one set field with field-specific helpers — the plate
// calculator today — so it gets its own thin wrapper around the generic
// CounterEditModal rather than every caller having to know to pass one in.
export function WeightEditModal({ weight, unit, showPlateCalculator, onChangeValue, onInc, onDec, onClose }) {
  return (
    <CounterEditModal title="Edit Weight" label={unit.toUpperCase()} value={weight} onChangeValue={onChangeValue} onInc={onInc} onDec={onDec} onClose={onClose}>
      {(focusInput) => showPlateCalculator && <WeightToolbar value={weight} unit={unit} focusInput={focusInput} />}
    </CounterEditModal>
  );
}
