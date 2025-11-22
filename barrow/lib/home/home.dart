import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';

class Home extends StatelessWidget {
  const Home({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(
            child: Stack(
              children: [
                TableCalendar(
                  firstDay: DateTime.utc(2025, 7, 1),
                  lastDay: DateTime.now().add(const Duration(days: 365)),
                  focusedDay: DateTime.now(),
                  shouldFillViewport: true,
                  availableCalendarFormats: const {
                    CalendarFormat.month: 'Month',
                  },
                  calendarBuilders: CalendarBuilders(
                    defaultBuilder: (context, day, focusedDay) {
                      return Container(
                        alignment: Alignment
                            .topLeft, // Change this to desired position
                        margin: EdgeInsets.all(2),
                        padding: EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.rectangle,
                          border: Border.all(
                            color: Colors.grey.shade900.withValues(alpha: .75),
                            width: 1,
                          ),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text('${day.day}'),
                      );
                    },
                    todayBuilder: (context, day, focusedDay) {
                      return Container(
                        alignment: Alignment
                            .topLeft, // Change this to desired position
                        padding: EdgeInsets.fromLTRB(5, 2, 5, 5),
                        margin: EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          shape: BoxShape.rectangle,
                          border: Border.all(
                            color: Colors.amber.shade800.withValues(alpha: .5),
                            width: 1,
                          ),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${day.day}',
                          style: TextStyle(
                            color: Colors.amber,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    },
                    selectedBuilder: (context, day, focusedDay) {
                      return Container(
                        alignment: Alignment
                            .topCenter, // Change this to desired position
                        padding: EdgeInsets.fromLTRB(5, 2, 5, 5),
                        decoration: BoxDecoration(
                          shape: BoxShape.rectangle,
                          border: BoxBorder.all(
                            color: Colors.amber.shade800,
                            width: 2,
                          ),
                        ),
                        child: Text(
                          '${day.day}',
                          style: TextStyle(
                            color: Colors.amber,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    },
                    outsideBuilder: (context, day, focusedDay) {
                      return Container(
                        alignment: Alignment
                            .topCenter, // Change this to desired position
                        padding: EdgeInsets.all(4),
                        child: Text(
                          '${day.day}',
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    },
                  ),
                  calendarStyle: CalendarStyle(
                    todayDecoration: BoxDecoration(
                      color: Colors.transparent,
                      shape: BoxShape.rectangle,
                      border: BoxBorder.fromLTRB(
                        top: BorderSide(color: Colors.amber, width: 2),
                      ),
                    ),
                    todayTextStyle: TextStyle(
                      color: Colors.amber,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.bottomRight,
                  child: FloatingActionButton.extended(
                    onPressed: () => print('Add workout to day clicked'),
                    label: Text(
                      'Start a workout',
                      style: TextStyle(fontSize: 18),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
