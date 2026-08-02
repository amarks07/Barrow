"use client";

const STATUS_LABEL = {
  syncing: "Syncing…",
  synced: "Backed up",
  error: "Backup error",
};

// The profile screen is only reachable once signed in (see SignInModal /
// BarrowApp), so this just shows sync status and a way to sign out.
export function CloudBackupSection({ cloudSync }) {
  const { session, status, error, signOut } = cloudSync;
  if (!session) return null;

  return (
    <div className="mt-6 pt-6" style={{ borderTop: "1.5px solid var(--line)" }}>
      <div className="display text-[13px] mb-3 uppercase" style={{ color: "var(--text-dim)" }}>Cloud backup</div>
      <div className="text-[13px] mb-1" style={{ color: "var(--text)" }}>Signed in as {session.user.email}</div>
      <div className="text-[11px] mb-4" style={{ color: status === "error" ? "var(--danger)" : "var(--text-dim)" }}>
        {status === "error" && error ? `Backup error: ${error}` : STATUS_LABEL[status] || "Idle"}
      </div>
      <button
        onClick={signOut}
        className="text-[13px] font-semibold px-2.5 py-1.5 rounded-full"
        style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1.5px solid var(--line-strong)" }}
      >
        Sign out
      </button>
    </div>
  );
}
