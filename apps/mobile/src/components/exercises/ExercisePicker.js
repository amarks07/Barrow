import { useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { CATEGORIES } from "@barrow/core";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { ColorSwitch } from "../ui/ColorSwitch";
import { CategoryFilterChips } from "../ui/CategoryFilterChips";
import { FAB } from "../ui/FAB";
import { ExerciseRows } from "./ExerciseRows";
import { AddCustomExerciseModal } from "./AddCustomExerciseModal";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Used by the day view (add/swap an exercise) and the template builder.
// `onAddCustom`, when passed, shows a FAB to define and immediately pick a
// custom exercise without leaving the picker. Presented as a full-screen
// Modal so any screen can pop it up ad hoc, matching the web app's
// absolute-inset overlay pattern.
export function ExercisePicker({
  exercises,
  exerciseView,
  setExerciseView,
  onPick,
  onUnpick,
  onClose,
  onAddCustom,
  alreadyPicked = [],
  title = "Choose exercise",
  doneLabel,
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddCustom, setShowAddCustom] = useState(false);

  const filtered = exercises.filter(
    (e) => e.name.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "all" || e.category === categoryFilter)
  );
  const grouped = CATEGORIES.map((cat) => ({ cat, items: filtered.filter((e) => e.category === cat) })).filter(
    (g) => g.items.length
  );

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
        <View
          className="flex-row items-center gap-3 px-5 pb-4"
          style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}
        >
          <IconBtn label="Close" onPress={onClose}>
            <X size={17} color={tokens.text} />
          </IconBtn>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text, flex: 1 }}>{title}</Text>
          <ColorSwitch
            value={exerciseView}
            onChange={setExerciseView}
            options={[
              { value: "grouped", label: "Group" },
              { value: "flat", label: "List" },
            ]}
          />
        </View>
        <View className="px-5 pt-4 pb-2">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={tokens.textDim}
            className="py-1.5"
            style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
          />
        </View>
        <CategoryFilterChips value={categoryFilter} onChange={setCategoryFilter} />
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: doneLabel ? 88 + insets.bottom : 24 }}>
          {exerciseView === "flat" ? (
            <ExerciseRows items={filtered} onPick={onPick} onUnpick={onUnpick} alreadyPicked={alreadyPicked} />
          ) : (
            grouped.map((g) => (
              <View key={g.cat} className="mb-5">
                <Text
                  style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }}
                  className="mb-1.5"
                >
                  {g.cat}
                </Text>
                <ExerciseRows items={g.items} onPick={onPick} onUnpick={onUnpick} alreadyPicked={alreadyPicked} />
              </View>
            ))
          )}
          {filtered.length === 0 && (
            <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center", marginTop: 24 }}>
              No exercises match{query ? ` "${query}"` : ""}
              {categoryFilter !== "all" ? ` in ${categoryFilter}` : ""}.
            </Text>
          )}
        </ScrollView>

        {doneLabel && (
          <View
            className="absolute left-0 right-0 bottom-0 px-5 pt-4"
            style={{
              backgroundColor: tokens.bg,
              borderTopWidth: 1.5,
              borderTopColor: tokens.line,
              paddingBottom: Math.max(16, insets.bottom),
            }}
          >
            <Button label={doneLabel} onPress={onClose} size="large" variant="solid" fullWidth />
          </View>
        )}

        {onAddCustom && (
          <FAB
            label="Add custom exercise"
            onPress={() => setShowAddCustom(true)}
            bottom={doneLabel ? 88 + insets.bottom : 20 + insets.bottom}
          />
        )}

        {showAddCustom && (
          <AddCustomExerciseModal
            onClose={() => setShowAddCustom(false)}
            onSave={(name, category, muscle) => {
              onPick(onAddCustom(name, category, muscle));
              setShowAddCustom(false);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
