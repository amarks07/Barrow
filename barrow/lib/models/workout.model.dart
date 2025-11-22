import 'package:barrow/models/exercise.model.dart';

class Workout {
  final String? id;
  final String name;
  final String notes;
  final List<Exercise> exercises;

  Workout({
    required this.id,
    required this.name,
    required this.notes,
    required this.exercises,
  });
}
