import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class Navbar extends StatelessWidget {
  const Navbar({super.key, required this.currentTabIndex});

  final int currentTabIndex;

  @override
  Widget build(BuildContext context) {
    double screenWidth = MediaQuery.of(context).size.width;

    // Return a compact bottom bar widget (do NOT use a Scaffold here).
    // The parent Scaffold (in main.dart) provides the overall layout; this
    // widget should only provide the bottomNavigationBar content.
    return SafeArea(
      top: false,
      child: SizedBox(
        // include extra space for the visual bottom margin used previously
        height: 45 + screenWidth * .05,
        child: Center(
          child: Container(
            width: screenWidth * .925,
            height: 45,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: Colors.grey[850],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                TextButton(
                  onPressed: () => context.go('/'),
                  style: TextButton.styleFrom(
                    splashFactory: InkRipple.splashFactory,
                    foregroundColor: Colors.white,
                  ),
                  child: Icon(
                    Icons.calendar_today,
                    color: currentTabIndex == 0 ? Colors.amber : Colors.white,
                    size: 24,
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/workouts'),
                  style: TextButton.styleFrom(
                    splashFactory: InkRipple.splashFactory,
                    foregroundColor: Colors.white,
                  ),
                  child: Icon(
                    Icons.assignment,
                    color: currentTabIndex == 1 ? Colors.amber : Colors.white,
                    size: 24,
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/exercises'),
                  style: TextButton.styleFrom(
                    splashFactory: InkRipple.splashFactory,
                    foregroundColor: Colors.white,
                  ),
                  child: Icon(
                    Icons.list_alt,
                    color: currentTabIndex == 2 ? Colors.amber : Colors.white,
                    size: 24,
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/settings'),
                  style: TextButton.styleFrom(
                    splashFactory: InkRipple.splashFactory,
                    foregroundColor: Colors.white,
                  ),
                  child: Icon(
                    Icons.settings,
                    color: currentTabIndex == 3 ? Colors.amber : Colors.white,
                    size: 24,
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
