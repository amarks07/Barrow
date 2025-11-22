import 'package:barrow/models/workout.model.dart';

class Day {
  final DateTime date;
  final List<Workout> workouts;

  Day({required this.date, required this.workouts});
}
