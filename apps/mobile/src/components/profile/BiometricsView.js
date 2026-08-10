import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { PickerField } from "../ui/PickerField";
import { BirthdayPicker, formatBirthdayDisplay } from "./BirthdayPicker";
import { GenderPicker, formatGenderDisplay } from "./GenderPicker";
import { HeightPicker, formatHeightDisplay } from "./HeightPicker";
import { WeightPicker, formatWeightDisplay } from "./WeightPicker";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Physical-stats half of the old single Profile screen (birthday, gender,
// height, weight) — as opposed to ProfileSettingsView's account-identity
// fields. Reached from ProfileView's hub; `onBack` returns there.
export function BiometricsView({ profile, onUpdate, onBack }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <View
        className="flex-row items-center gap-3 px-5 pb-4"
        style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
      >
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Biometrics</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 + insets.bottom }}>
        <PickerField label="Birthday" title="Birthday" displayValue={formatBirthdayDisplay(profile.birthday)}>
          <BirthdayPicker value={profile.birthday} onChange={(v) => onUpdate("birthday", v)} />
        </PickerField>

        <PickerField label="Gender" title="Gender" displayValue={formatGenderDisplay(profile.gender)}>
          <GenderPicker value={profile.gender} onChange={(v) => onUpdate("gender", v)} />
        </PickerField>

        <PickerField label="Height" title="Height" displayValue={formatHeightDisplay(profile.height)}>
          <HeightPicker value={profile.height} onChange={(v) => onUpdate("height", v)} />
        </PickerField>

        <PickerField label="Weight (lb)" title="Weight" displayValue={formatWeightDisplay(profile.weight)}>
          <WeightPicker value={profile.weight} onChange={(v) => onUpdate("weight", v)} />
        </PickerField>
      </ScrollView>
    </View>
  );
}
