import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { groupContiguous, groupIndexOf, pruneGroups, runInfo } from "@barrow/core";
import { ExercisePicker } from "../exercises/ExercisePicker";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

// Bottom-sheet popup — a dark backdrop with a panel sliding up from the
// bottom, capped at 80% of screen height, matching the web app's shape.
export function TemplateBuilder({ exercises, onClose, onSave, onAddCustomExercise }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [supersets, setSupersets] = useState([]);
  const [supersetMode, setSupersetMode] = useState(false);
  const [supersetSelection, setSupersetSelection] = useState([]);
  const [removeSupersetMode, setRemoveSupersetMode] = useState(false);
  const [exerciseView, setExerciseView] = useState("grouped");
  const [showPicker, setShowPicker] = useState(false);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const canSave = name.trim().length > 0 && picked.length > 0;
  const hasAnyGroup = supersets.length > 0;
  const rowRuns = useMemo(() => {
    const groupKey = (id) => {
      const gi = groupIndexOf(supersets, id);
      return gi === -1 ? null : gi;
    };
    return runInfo(picked, groupKey);
  }, [picked, supersets]);

  const removePicked = (id) => {
    const next = picked.filter((p) => p !== id);
    setPicked(next);
    setSupersets((prev) => pruneGroups(prev, next));
  };

  const cancelSuperset = () => {
    setSupersetMode(false);
    setSupersetSelection([]);
  };

  const saveSuperset = () => {
    if (supersetSelection.length >= 2) {
      setPicked((prev) => groupContiguous(prev, supersetSelection, (id) => id));
      setSupersets((prev) => [...prev, supersetSelection]);
    }
    setSupersetMode(false);
    setSupersetSelection([]);
  };

  const maxHeight = Dimensions.get("window").height * 0.8;

  const slideAnim = useRef(new Animated.Value(1000)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={onClose}
        />
        <Animated.View
          className="p-5"
          style={{
            backgroundColor: tokens.bg,
            borderTopWidth: 1.5,
            borderTopColor: tokens.line,
            maxHeight,
            paddingBottom: Math.max(20, insets.bottom),
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }} className="mb-4">
            New template
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Template name (e.g. Push Day)"
            placeholderTextColor={tokens.textDim}
            autoFocus
            className="mb-4 py-1.5"
            style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
          />

          {picked.length >= 2 && (
            <View className="flex-row items-center justify-end gap-2 mb-2">
              {supersetMode ? (
                <>
                  <Text style={{ fontSize: 11, color: tokens.textDim, flex: 1 }}>
                    {supersetSelection.length < 2 ? "Select 2+ exercises to group" : `${supersetSelection.length} selected`}
                  </Text>
                  <Button label="Cancel" onPress={cancelSuperset} />
                  <Button label="Save" onPress={saveSuperset} disabled={supersetSelection.length < 2} variant="solid" />
                </>
              ) : removeSupersetMode ? (
                <>
                  <Text style={{ fontSize: 11, color: tokens.textDim, flex: 1 }}>Tap an exercise in a superset to remove it</Text>
                  <Button label="Cancel" onPress={() => setRemoveSupersetMode(false)} />
                </>
              ) : (
                <>
                  <Button label="Create superset" onPress={() => setSupersetMode(true)} />
                  {hasAnyGroup && <Button label="Remove superset" onPress={() => setRemoveSupersetMode(true)} />}
                </>
              )}
            </View>
          )}

          <ScrollView style={{ flexGrow: 0, marginBottom: 16 }}>
            {picked.length === 0 ? (
              <Text style={{ fontSize: 13, color: tokens.textDim }}>No exercises yet — tap "+ Add exercise" below.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {picked.map((id, i) => {
                  const run = rowRuns[i];
                  const isSelected = supersetSelection.includes(id);
                  return (
                    <View key={id} className="flex-row">
                      <Pressable
                        onPress={() => {
                          if (removeSupersetMode) {
                            const groupIndex = groupIndexOf(supersets, id);
                            if (groupIndex !== -1) {
                              setSupersets((prev) => prev.filter((_, gi) => gi !== groupIndex));
                              setRemoveSupersetMode(false);
                            }
                            return;
                          }
                          if (!supersetMode) return;
                          setSupersetSelection((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
                        }}
                        style={{ flex: 1 }}
                      >
                        <Card style={{ padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <View className="flex-row items-center gap-2 flex-1">
                            {supersetMode && (
                              <View
                                className="items-center justify-center rounded-full"
                                style={{
                                  width: 18,
                                  height: 18,
                                  backgroundColor: isSelected ? tokens.accent : "transparent",
                                  borderWidth: 1.5,
                                  borderColor: isSelected ? tokens.accent : tokens.lineStrong,
                                }}
                              >
                                {isSelected && <Check size={12} color="#121214" />}
                              </View>
                            )}
                            <Text style={{ fontSize: 14, color: tokens.text }} numberOfLines={1}>
                              {exMap[id]?.name}
                            </Text>
                          </View>
                          {!supersetMode && !removeSupersetMode && (
                            <Pressable onPress={() => removePicked(id)} accessibilityLabel="Remove from template" hitSlop={8}>
                              <X size={14} color={tokens.textDim} />
                            </Pressable>
                          )}
                        </Card>
                      </Pressable>
                      {run.isGrouped && (
                        <View style={{ position: "relative", width: 12 }}>
                          {!run.isFirst && (
                            <View style={{ position: "absolute", right: 3, top: -4, bottom: "50%", width: 1.5, backgroundColor: tokens.accent }} />
                          )}
                          {!run.isLast && (
                            <View style={{ position: "absolute", right: 3, top: "50%", bottom: -4, width: 1.5, backgroundColor: tokens.accent }} />
                          )}
                          <View
                            style={{
                              position: "absolute",
                              right: 0.5,
                              top: "50%",
                              marginTop: -3,
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: tokens.accent,
                            }}
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <Pressable
            onPress={() => setShowPicker(true)}
            className="w-full py-2.5 rounded-lg items-center mb-6"
            style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: tokens.lineStrong }}
          >
            <Text
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 13,
                lineHeight: 13,
                textTransform: "uppercase",
                includeFontPadding: false,
                textAlignVertical: "center",
                color: tokens.accent,
              }}
            >
              + Add exercise
            </Text>
          </Pressable>

          <View className="flex-row items-center justify-between">
            <Button label="Cancel" onPress={onClose} size="medium" />
            <Button
              label="Save"
              onPress={() => canSave && onSave(name.trim(), picked, supersets)}
              disabled={!canSave}
              variant="solid"
              size="medium"
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          exerciseView={exerciseView}
          setExerciseView={setExerciseView}
          alreadyPicked={picked}
          onPick={(ex) => setPicked((p) => (p.includes(ex.id) ? p : [...p, ex.id]))}
          onUnpick={(ex) => removePicked(ex.id)}
          onClose={() => setShowPicker(false)}
          onAddCustom={onAddCustomExercise}
          doneLabel="Done"
        />
      )}
    </Modal>
  );
}
