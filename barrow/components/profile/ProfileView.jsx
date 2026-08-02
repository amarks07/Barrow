"use client";

import { ArrowLeft, User } from "lucide-react";
import { IconBtn } from "../ui/IconBtn";
import { ProfileField } from "./ProfileField";

export function ProfileView({ profile, onUpdate, onClose }) {
  const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "var(--bg)", zIndex: 50 }}>
      <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: "1.5px solid var(--line)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <IconBtn label="Close" onClick={onClose}><ArrowLeft size={17} /></IconBtn>
        <h3 className="display text-[19px]" style={{ color: "var(--text)" }}>Profile</h3>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5">
        <div className="flex flex-col items-center mb-6">
          <div
            className="flex items-center justify-center"
            style={{ width: 84, height: 84, borderRadius: 999, background: "var(--surface)", border: "1.5px solid var(--line-strong)", overflow: "hidden" }}
          >
            {profile.pictureUrl ? (
              <img src={profile.pictureUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : initials ? (
              <span className="display text-[24px]" style={{ color: "var(--text-dim)" }}>{initials}</span>
            ) : (
              <User size={32} color="var(--text-dim)" />
            )}
          </div>
        </div>

        <ProfileField label="Profile picture URL" value={profile.pictureUrl} onChange={(v) => onUpdate("pictureUrl", v)} placeholder="https://…" />
        <ProfileField label="First name" value={profile.firstName} onChange={(v) => onUpdate("firstName", v)} />
        <ProfileField label="Last name" value={profile.lastName} onChange={(v) => onUpdate("lastName", v)} />
        <ProfileField label="Username" value={profile.username} onChange={(v) => onUpdate("username", v)} />
        <ProfileField label="Email" type="email" value={profile.email} onChange={(v) => onUpdate("email", v)} />

        <div className="mt-2">
          <div className="text-[11px] mb-1" style={{ color: "var(--text-dim)" }}>Profile ID</div>
          <div className="text-[14px] tabular" style={{ color: "var(--text-dim)" }}>{profile.profileId}</div>
        </div>
      </div>
    </div>
  );
}
