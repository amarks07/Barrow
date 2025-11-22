import 'package:barrow/models/exercise-set.model.dart';

class Exercise {
  final String id;
  final String name;
  final String notes;
  final String category;
  final List<ExerciseSet>? sets;

  Exercise({
    required this.id,
    required this.name,
    required this.notes,
    required this.category,
    required this.sets,
  });
}
