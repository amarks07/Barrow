import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Pencil } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { StretchPanel } from "./StretchPanel";
import { StretchRoutineModal } from "./StretchRoutineModal";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Where a stretch routine actually gets *run*: tap in from the Stretches
// tab and the poses/countdowns (StretchPanel) are right here, front and
// center, instead of being buried inside a workout entry. Editing the
// routine (name/poses) is a corner action via the pencil button, not the
// primary thing this screen is for — mirrors RoutineDetailView's
// back/title/actions header, but the title is plain text (not
// EditableTitle) since renaming happens through the same edit modal as
// everything else about the routine.
export function StretchRoutineDetailView({ routine, onBack, onSave, onDelete }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [showEdit, setShowEdit] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View
        className="flex-row items-center gap-3 px-5 pt-4 pb-4"
        style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
      >
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <Text
          style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}
          className="flex-1"
          numberOfLines={1}
        >
          {routine.name}
        </Text>
        <IconBtn label="Edit stretch routine" onPress={() => setShowEdit(true)}>
          <Pencil size={17} color={tokens.text} />
        </IconBtn>
        <ConfirmDeleteIconButton onConfirm={onDelete} label="Delete stretch routine" size={16} />
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 + insets.bottom, gap: 8 }}
      >
        {routine.stretches.length === 0 ? (
          <Text style={{ fontSize: 13, color: tokens.textDim }}>No poses yet — tap the pencil to add some.</Text>
        ) : (
          <StretchPanel ex={routine} />
        )}
      </ScrollView>

      {showEdit && (
        <StretchRoutineModal
          initial={routine}
          onClose={() => setShowEdit(false)}
          onSave={(name, stretches) => {
            onSave(name, stretches);
            setShowEdit(false);
          }}
        />
      )}
    </View>
  );
}
