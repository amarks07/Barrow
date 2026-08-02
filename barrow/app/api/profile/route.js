// PLACEHOLDER API ROUTE — not wired to the client app yet, and not backed by
// real storage. This in-memory object resets on every cold start and is NOT
// shared across users or deploys — it exists only to sketch the shape of the
// endpoint you'll want once a real database is in place.
//
// To make this real:
//   1. Pick a database (Vercel Postgres, Supabase, PlanetScale, Neon, etc.)
//      and an auth provider (NextAuth.js, Clerk, Supabase Auth, etc.) — this
//      needs a decision, so it isn't picked for you here.
//   2. Replace the in-memory `mockProfiles` map with real reads/writes.
//   3. Get the current user's id from the auth session instead of a
//      hardcoded "demo-user" key.
//   4. Point the client (see BarrowApp.jsx) at this route instead of
//      keeping `profile` in local React state.

let mockProfiles = {
  "demo-user": {
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    pictureUrl: "",
    profileId: "usr-demo0001",
  },
};

export async function GET() {
  return Response.json(mockProfiles["demo-user"]);
}

export async function PUT(request) {
  const updates = await request.json();
  mockProfiles["demo-user"] = { ...mockProfiles["demo-user"], ...updates };
  return Response.json(mockProfiles["demo-user"]);
}
