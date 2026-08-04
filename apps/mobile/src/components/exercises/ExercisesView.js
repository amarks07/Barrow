import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { CATEGORIES } from "@barrow/core";
import { ColorSwitch } from "../ui/ColorSwitch";
import { CategoryFilterChips } from "../ui/CategoryFilterChips";
import { FAB } from "../ui/FAB";
import { ExerciseTile } from "./ExerciseTile";
import { ExerciseListRow } from "./ExerciseListRow";
import { AddCustomExerciseModal } from "./AddCustomExerciseModal";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

export function ExercisesView({ exercises, exerciseView, setExerciseView, onOpenHistory, onAddCustom, onDeleteExercise }) {
  const { tokens } = useTheme();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = exercises.filter(
    (e) => e.name.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "all" || e.category === categoryFilter)
  );
  const grouped = CATEGORIES.map((cat) => ({ cat, items: filtered.filter((e) => e.category === cat) })).filter((g) => g.items.length);

  return (
    <View className="flex-1">
      <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Exercises</Text>
        <ColorSwitch
          value={exerciseView}
          onChange={setExerciseView}
          options={[
            { value: "grouped", label: "Group" },
            { value: "flat", label: "List" },
          ]}
        />
      </View>
      <View className="px-5 pb-3">
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
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 88 }}>
        {exerciseView === "flat" ? (
          <View style={{ gap: 8 }}>
            {filtered.map((ex) => (
              <ExerciseListRow key={ex.id} ex={ex} onOpen={onOpenHistory} onDelete={onDeleteExercise} />
            ))}
          </View>
        ) : (
          grouped.map((g) => (
            <View key={g.cat} className="mb-5">
              <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-1.5">
                {g.cat}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {g.items.map((ex) => (
                  <ExerciseTile key={ex.id} ex={ex} onOpen={onOpenHistory} onDelete={onDeleteExercise} style={{ width: "48.5%" }} />
                ))}
              </View>
            </View>
          ))
        )}
        {filtered.length === 0 && (
          <Text style={{ fontSize: 13, color: tokens.textDim, textAlign: "center" }} className="mt-6">
            No exercises match{query ? ` "${query}"` : ""}
            {categoryFilter !== "all" ? ` in ${categoryFilter}` : ""}.
          </Text>
        )}
      </ScrollView>

      <FAB label="Add custom exercise" onPress={() => setShowAdd(true)} />

      {showAdd && (
        <AddCustomExerciseModal
          onClose={() => setShowAdd(false)}
          onSave={(name, category, muscle) => {
            onAddCustom(name, category, muscle);
            setShowAdd(false);
          }}
        />
      )}
    </View>
  );
}
