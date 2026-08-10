import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { Card } from "../ui/Card";
import { useTheme } from "../../theme/ThemeProvider";

const OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

// For PickerField's read-only row.
export function formatGenderDisplay(value) {
  return OPTIONS.find((o) => o.value === value)?.label || "";
}

// A plain single-select list — used inside a PickerField sheet the same way
// BirthdayPicker/HeightPicker/WeightPicker use their wheel dials there, just
// rows instead of a dial since gender only has three options.
export function GenderPicker({ value, onChange }) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignSelf: "stretch", paddingHorizontal: 20, gap: 8 }}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Card key={opt.value} selected={active} style={{ padding: 12 }}>
            <Pressable onPress={() => onChange(opt.value)} className="flex-row items-center justify-between">
              <Text style={{ fontSize: 15, color: tokens.text }}>{opt.label}</Text>
              {active && <Check size={16} color={tokens.accent} />}
            </Pressable>
          </Card>
        );
      })}
    </View>
  );
}
