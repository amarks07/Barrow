import { View } from "react-native";
import { TemplatesView } from "../../components/templates/TemplatesView";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../theme/ThemeProvider";

export function TemplatesScreen({ navigation }) {
  const { tokens } = useTheme();
  const { templates, exercises, templateActions, exerciseActions } = useAppState();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <TemplatesView
        templates={templates}
        exercises={exercises}
        onCreate={templateActions.createTemplate}
        onDelete={templateActions.deleteTemplate}
        onOpenTemplate={(templateId) => navigation.navigate("TemplateDetail", { templateId })}
        onAddCustomExercise={exerciseActions.addCustomExercise}
      />
    </View>
  );
}
