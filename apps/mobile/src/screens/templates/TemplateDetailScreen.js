import { useEffect } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { TemplateDetailView } from "../../components/templates/TemplateDetailView";

// Pushed on top of Templates in the root stack — going back from a Day
// screen opened via "Recent uses" naturally drops back into this screen,
// matching the web app's "template detail sits under a day view" comment.
export function TemplateDetailScreen({ route, navigation }) {
  const { templateId } = route.params;
  const { templates, exercises, workouts, templateActions, exerciseActions, getOrCreateWorkoutForDate } = useAppState();
  const template = templates.find((t) => t.id === templateId);

  useEffect(() => {
    if (!template) navigation.goBack();
  }, [template, navigation]);

  if (!template) return null;

  return (
    <TemplateDetailView
      template={template}
      exercises={exercises}
      workouts={workouts}
      onBack={() => navigation.goBack()}
      onDelete={() => {
        templateActions.deleteTemplate(template.id);
        navigation.goBack();
      }}
      onRename={templateActions.renameTemplate}
      onSelectDate={(dateKey) => {
        const workoutId = getOrCreateWorkoutForDate(dateKey);
        navigation.navigate("Day", { dateKey, workoutId });
      }}
      onAddExercise={templateActions.addExerciseToTemplate}
      onRemoveExercise={templateActions.removeExerciseFromTemplate}
      onAddCustomExercise={exerciseActions.addCustomExercise}
    />
  );
}
