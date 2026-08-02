// PLACEHOLDER API ROUTE — see the comment in app/api/profile/route.js.
// Same caveats apply: in-memory, not persistent, not per-user, not wired
// to the client app yet. This sketches the shape of a workouts endpoint —
// keyed by date, matching the `workouts` object shape already used by
// BarrowApp.jsx — for when a real database is in place.

let mockWorkouts = {};

export async function GET() {
  return Response.json(mockWorkouts);
}

export async function PUT(request) {
  const { dateKey, workout } = await request.json();
  if (!dateKey) {
    return Response.json({ error: "dateKey is required" }, { status: 400 });
  }
  mockWorkouts[dateKey] = workout;
  return Response.json(mockWorkouts[dateKey]);
}
