import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { LogOut, Briefcase, Users, Hash, Pencil, Check } from "lucide-react";
import { useAuth, signOut as authSignOut, updateDisplayName } from "@/lib/auth";
import { gsap } from "gsap";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Punch" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("");

  const avatarRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.set(avatarRef.current, { scale: 0.82, opacity: 0 });
    if (infoRef.current?.children) gsap.set(infoRef.current.children, { y: 14, opacity: 0 });

    const tl = gsap.timeline();
    tl.to(avatarRef.current, {
      scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.6)",
    })
    .to(infoRef.current?.children ?? [], {
      y: 0, opacity: 1, stagger: 0.08, duration: 0.4, ease: "power2.out",
    }, "-=0.2");

    return () => { tl.kill(); };
  }, []);

  useEffect(() => {
    setDraftDisplayName(user?.display_name ?? "");
  }, [user?.display_name]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    authSignOut();
    navigate({ to: "/auth", replace: true });
  }

  const fullName = user?.full_name ?? "";
  const displayName = user?.display_name?.trim() || "";
  const initials = fullName
    .split(" ").filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase()).join("");

  function saveDisplayName() {
    try {
      updateDisplayName(draftDisplayName);
      setEditingName(false);
      toast.success("Display name updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update display name";
      toast.error(message);
    }
  }

  return (
    <div className="px-6 pt-12 pb-24">
      <h1 className="font-display text-3xl font-extrabold mb-8">Profile</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center text-center mb-8">
        <div
          ref={avatarRef}
          className="size-24 rounded-3xl flex items-center justify-center font-display text-3xl font-extrabold text-white mb-4"
          style={{
            background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))",
            boxShadow: "0 12px 32px rgba(79,70,229,0.25)",
          }}
        >
          {initials || "·"}
        </div>
        <p className="font-display text-xl font-bold">{displayName || fullName || "—"}</p>
        {displayName && (
          <p className="text-xs text-muted-foreground mt-1">Employee record name: {fullName || "—"}</p>
        )}
        <p className="text-xs text-muted-foreground font-medium mt-1">
          {user?.designation || "Employee"}
          {user?.team ? ` · ${user.team}` : ""}
        </p>
        <span className="mt-2 inline-block font-mono text-[11px] font-bold text-primary bg-primary/8 px-3 py-1 rounded-full">
          {user?.emp_code}
        </span>
      </div>

      {/* Info cards */}
      <div ref={infoRef} className="space-y-2 mb-6">
        <div
          className="px-4 py-3.5 rounded-2xl bg-white border border-border"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Pencil className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Display name</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Used only in your employee view.</p>
                </div>
                <button
                  onClick={() => (editingName ? saveDisplayName() : setEditingName(true))}
                  className="size-9 rounded-xl border border-border flex items-center justify-center text-primary hover:bg-primary/5 transition-colors shrink-0"
                  title={editingName ? "Save display name" : "Edit display name"}
                >
                  {editingName ? <Check className="size-4" /> : <Pencil className="size-4" />}
                </button>
              </div>
              <input
                value={draftDisplayName}
                onChange={(e) => setDraftDisplayName(e.target.value)}
                maxLength={40}
                disabled={!editingName}
                placeholder={fullName || "Add a display name"}
                className="mt-3 w-full h-11 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm disabled:opacity-70"
              />
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-border"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Briefcase className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Designation</p>
            <p className="text-sm font-semibold mt-0.5 truncate">{user?.designation || "—"}</p>
          </div>
        </div>

        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-border"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Team</p>
            <p className="text-sm font-semibold mt-0.5 truncate">{user?.team || "—"}</p>
          </div>
        </div>

        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-border"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Hash className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Employee ID</p>
            <p className="font-mono text-sm font-bold mt-0.5 text-primary truncate">{user?.emp_code || "—"}</p>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={signOut}
        className="w-full h-12 rounded-2xl border border-rose-200 text-rose-600 font-semibold flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors"
      >
        <LogOut className="size-4" />
        Sign out
      </motion.button>

      <p className="text-center text-[10px] text-muted-foreground mt-8 font-mono">
        <span className="text-primary">●</span> Punch · v1.0
      </p>
    </div>
  );
}
