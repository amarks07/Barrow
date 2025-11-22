import 'package:barrow/models/workout.model.dart';
import 'package:barrow/models/workout.model.dart';
import 'package:barrow/test-data.dart';
import 'package:flutter/material.dart';

class Workouts extends StatelessWidget {
  const Workouts({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Workout> workouts = mockWorkouts;

    return Scaffold(
      body: SafeArea(
        child: SizedBox(
          child: Stack(
            children: [
              Column(
                children: [
                  Row(
                    children: [
                      Padding(
                        padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
                        child: Text(
                          'Workouts',
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
                    itemCount: workouts.length,
                    itemBuilder: (context, index) {
                      final workout = workouts[index];
                      return Card(
                        margin: EdgeInsets.symmetric(
                          vertical: 8,
                          horizontal: 16,
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                workout.name,
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Padding(
                                padding: EdgeInsets.symmetric(vertical: 4),
                                child: Text(
                                  'Exercises',
                                  style: TextStyle(
                                    color: Colors.amber,
                                    fontWeight: FontWeight.w500,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              if (workout.exercises.isNotEmpty)
                                ListView.builder(
                                  shrinkWrap: true,
                                  itemCount: workout.exercises.length,
                                  itemBuilder: (context, index) {
                                    final exercise = workout.exercises[index];
                                    return Row(children: [Text(exercise.name)]);
                                  },
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
              Padding(
                padding: EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                child: Align(
                  alignment: Alignment.bottomRight,
                  child: FloatingActionButton(
                    onPressed: () => print('Add workout clicked'),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(Icons.add, size: 36),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
