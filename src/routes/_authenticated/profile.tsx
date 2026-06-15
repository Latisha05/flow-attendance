import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { LogOut, Briefcase, Users, Hash, Pencil, Check, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth, signOut as authSignOut, updateDisplayName, setupCredentials } from "@/lib/auth";
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

  const needsSetup = !user?.email;

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

      {/* Setup prompt banner */}
      {needsSetup && (
        <div
          className="mb-4 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 border border-amber-200"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="size-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Account setup pending</p>
            <p className="text-xs text-amber-700 mt-0.5">Set up your email and password to secure your account.</p>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div ref={infoRef} className="space-y-2 mb-6">
        {/* Display name */}
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

        {/* Email / credentials setup */}
        <CredentialsCard email={user?.email} userId={user?.id} />

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

function CredentialsCard({ email, userId }: { email?: string; userId?: string }) {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!userId) return null;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword && newPassword !== confirm) { toast.error("Passwords do not match"); return; }
    if (newPassword && newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (!newEmail.trim() && !newPassword) { toast.error("Enter an email or new password"); return; }
    setLoading(true);
    try {
      await setupCredentials(newEmail, newPassword);
      toast.success("Credentials updated");
      setOpen(false);
      setNewPassword("");
      setConfirm("");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="px-4 py-3.5 rounded-2xl bg-white border border-border"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start gap-3">
        <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${email ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-600"}`}>
          <Mail className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email &amp; Password</p>
              <p className="text-sm font-semibold mt-0.5 truncate">
                {email ? email : <span className="text-amber-600 text-xs font-semibold">Not set up yet</span>}
              </p>
            </div>
            <button
              onClick={() => { setOpen((o) => !o); setNewEmail(email ?? ""); setNewPassword(""); setConfirm(""); }}
              className="size-9 rounded-xl border border-border flex items-center justify-center text-primary hover:bg-primary/5 transition-colors shrink-0"
              title={email ? "Update credentials" : "Set up credentials"}
            >
              <Pencil className="size-4" />
            </button>
          </div>

          {open && (
            <form onSubmit={save} className="mt-3 space-y-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full h-11 px-3 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
              />
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className="w-full h-11 px-3 pr-10 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="w-full h-11 px-3 pr-10 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10 rounded-2xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-10 rounded-2xl text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
                  style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
                >
                  {loading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
