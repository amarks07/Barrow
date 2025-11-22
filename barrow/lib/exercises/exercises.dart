import 'package:barrow/models/exercise.model.dart';
import 'package:barrow/test-data.dart';
import 'package:flutter/material.dart';

class Exercises extends StatelessWidget {
  const Exercises({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Exercise> exercises = mockExercises;

    return Scaffold(
      body: SafeArea(
        child: SizedBox(
          child: Column(
            children: [
              Row(
                children: [
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
                    child: Text(
                      'Exercises',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              ListView.builder(
                shrinkWrap: true,
                itemCount: exercises.length,
                itemBuilder: (context, index) {
                  final exercise = exercises[index];
                  return Card(
                    margin: EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                    child: Padding(
                      padding: EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            exercise.name,
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text('Last 3 sets'),
                          if (exercise.sets != null &&
                              exercise.sets!.isNotEmpty)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                Text(
                                  exercise
                                      .sets![exercise.sets!.length - 1]
                                      .weight
                                      .toString(),
                                ),
                                Text(
                                  exercise.sets![exercise.sets!.length - 1].reps
                                      .toString(),
                                ),
                              ],
                            ),
                          if (exercise.sets != null &&
                              exercise.sets!.length >= 2)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                Text(
                                  exercise
                                      .sets![exercise.sets!.length - 1]
                                      .weight
                                      .toString(),
                                ),
                                Text(
                                  exercise.sets![exercise.sets!.length - 1].reps
                                      .toString(),
                                ),
                              ],
                            ),
                          if (exercise.sets != null &&
                              exercise.sets!.length >= 3)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                Text(
                                  exercise
                                      .sets![exercise.sets!.length - 3]
                                      .weight
                                      .toString(),
                                ),
                                Text(
                                  exercise.sets![exercise.sets!.length - 3].reps
                                      .toString(),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
