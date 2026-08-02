"use client";

import { useState } from "react";

const TITLES = { signin: "Sign in", signup: "Create account", forgot: "Reset password" };

// Top-sheet popup — shown instead of the profile screen whenever there's no
// signed-in session.
export function SignInModal({ cloudSync, onClose }) {
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { available, status, error, signIn, signUp, resetPassword } = cloudSync;

  const busy = status === "authenticating";
  const done = status === "confirm-email" || status === "reset-email-sent";

  const submit = () => {
    if (!email.trim()) return;
    if (mode === "signin") password && signIn(email.trim(), password);
    else if (mode === "signup") password && signUp(email.trim(), password);
    else resetPassword(email.trim());
  };

  return (
    <div className="absolute inset-0 z-40 flex items-start" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div
        className="w-full p-5"
        style={{ background: "var(--bg)", borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <h3 className="display text-[19px] mb-4" style={{ color: "var(--text)" }}>{TITLES[mode]}</h3>

        {!available ? (
          <p className="text-[13px] mb-4" style={{ color: "var(--text-dim)" }}>
            Cloud backup isn't configured for this app yet.
          </p>
        ) : status === "confirm-email" ? (
          <p className="text-[13px] mb-4" style={{ color: "var(--text-dim)" }}>
            Check your email to confirm your account, then sign in.
          </p>
        ) : status === "reset-email-sent" ? (
          <p className="text-[13px] mb-4" style={{ color: "var(--text-dim)" }}>
            Check your email for a link to reset your password.
          </p>
        ) : (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="Email"
              autoFocus
              className="w-full text-[16px] outline-none py-1.5 mb-4"
              style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
            />

            {mode !== "forgot" && (
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="Password"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full text-[16px] outline-none py-1.5 mb-2"
                style={{ background: "transparent", color: "var(--text)", borderBottom: "1px solid var(--line-strong)" }}
              />
            )}

            {status === "error" && error && (
              <p className="text-[12px] mt-2" style={{ color: "var(--danger)" }}>{error}</p>
            )}

            <div className="flex flex-col items-start gap-2 mt-3 mb-4">
              {mode === "signin" && (
                <button onClick={() => setMode("forgot")} className="text-[12px]" style={{ color: "var(--text-dim)" }}>
                  Forgot your password?
                </button>
              )}
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-[12px]"
                style={{ color: "var(--accent)" }}
              >
                {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={done ? onClose : mode === "forgot" ? () => setMode("signin") : onClose}
            className="text-[13px]"
            style={{ color: "var(--text-dim)" }}
          >
            {done ? "Close" : mode === "forgot" ? "Back" : "Cancel"}
          </button>
          {available && !done && (
            <button
              onClick={submit}
              disabled={busy}
              className="text-[13px] font-bold px-4 py-2 rounded-full"
              style={{ background: "var(--accent)", color: "#121214" }}
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
