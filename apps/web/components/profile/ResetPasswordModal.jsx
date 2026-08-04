"use client";

import { useState } from "react";

// Shown automatically (regardless of whether Profile is open) whenever
// cloudSync.recoveryMode is true — i.e. the person just landed back on the
// app from a "reset your password" email link.
export function ResetPasswordModal({ cloudSync }) {
  const [password, setPassword] = useState("");
  const { status, error, updatePassword } = cloudSync;
  const busy = status === "authenticating";

  const submit = () => password.length >= 6 && updatePassword(password);

  return (
    <div className="absolute inset-0 z-50 flex items-start" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div
        className="w-full p-5"
        style={{ background: "var(--bg)", borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <h3 className="display text-[19px] mb-1" style={{ color: "var(--text)" }}>Set a new password</h3>
        <p className="text-[12px] mb-4" style={{ color: "var(--text-dim)" }}>
          Choose a new password for your account.
        </p>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full text-[16px] outline-none py-1.5 mb-2"
          style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
        />
        {status === "error" && error && (
          <p className="text-[12px] mt-2 mb-2" style={{ color: "var(--danger)" }}>{error}</p>
        )}
        <div className="flex items-center justify-end mt-3">
          <button
            onClick={submit}
            disabled={busy || password.length < 6}
            className="text-[13px] font-bold px-4 py-2 rounded-full"
            style={{ background: "var(--accent)", color: "#121214" }}
          >
            {busy ? "…" : "Set password"}
          </button>
        </div>
      </div>
    </div>
  );
}
