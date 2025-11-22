import 'package:barrow/models/day.model.dart';
import 'package:barrow/models/exercise-set.model.dart';
import 'package:barrow/models/exercise.model.dart';
import 'package:barrow/models/workout.model.dart';

final calendarData = [
  Day(date: new DateTime.now().subtract(Duration(days: 1)), workouts: []),
  Day(date: new DateTime.now(), workouts: []),
  Day(date: new DateTime.now().add(Duration(days: 1)), workouts: []),
];

final mockExercises = [
  Exercise(
    id: "1",
    name: "Bench Press",
    notes: "Standard bench press",
    category: "Chest",
    sets: [
      ExerciseSet(
        workoutId: "1",
        index: "1",
        notes: "First set of bench press",
        weight: 135.00,
        reps: "10",
      ),
      ExerciseSet(
        workoutId: "1",
        index: "2",
        notes: "Second set of bench press",
        weight: 135.00,
        reps: "10",
      ),
    ],
  ),
  Exercise(
    id: "2",
    name: "Squats",
    notes: "Barbell squats with proper form",
    category: "Legs",
    sets: [
      ExerciseSet(
        workoutId: "2",
        index: "1",
        notes: "",
        weight: 135.00,
        reps: "10",
      ),
    ],
  ),
];

final mockWorkouts = [
  Workout(
    id: "1",
    name: "Upper 1",
    notes: "Notes for Upper 1",
    exercises: mockExercises,
  ),
];
