import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LogOut, Sun, Moon, Building2, User2, Hash } from "lucide-react";
import { useAuth, signOut as authSignOut } from "@/lib/auth";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Punch" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const avatarRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // GSAP entrance stagger
  useLayoutEffect(() => {
    const tl = gsap.timeline();
    if (avatarRef.current) {
      tl.from(avatarRef.current, { scale: 0.7, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
    }
    if (infoRef.current) {
      tl.from(infoRef.current, { y: 10, opacity: 0, duration: 0.4, ease: "power2.out" }, "-=0.2");
    }
    if (cardsRef.current) {
      tl.from(cardsRef.current.children, { y: 12, opacity: 0, stagger: 0.07, duration: 0.35, ease: "power2.out" }, "-=0.1");
    }
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    authSignOut();
    navigate({ to: "/auth", replace: true });
  }

  function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }

  const isDark = typeof document !== "undefined"
    ? document.documentElement.classList.contains("dark")
    : true;

  const fullName = user?.full_name ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "·";

  const infoRows = [
    { icon: User2, label: "Role", value: user?.designation || "Employee" },
    { icon: Building2, label: "Team", value: user?.team || "—" },
    { icon: Hash, label: "Employee ID", value: user?.emp_code || "—" },
  ];

  return (
    <div className="px-6 pt-12">
      <h1 className="font-display text-3xl font-extrabold mb-8">Profile</h1>

      {/* Avatar with gradient ring */}
      <div className="flex flex-col items-center text-center mb-8">
        <div ref={avatarRef} className="mb-4">
          <div className="ring-gradient p-[2.5px] rounded-full" style={{ display: "inline-block" }}>
            <div
              className="size-20 rounded-full flex items-center justify-center font-display text-2xl font-extrabold"
              style={{ background: "oklch(0.14 0.028 264)", color: "white" }}
            >
              {initials}
            </div>
          </div>
        </div>

        <div ref={infoRef}>
          <p className="font-display text-xl font-bold">{fullName || "—"}</p>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            {user?.designation || "Employee"}
            {user?.team ? ` · ${user.team}` : ""}
          </p>
          <p className="font-mono text-[11px] text-primary font-bold mt-1">{user?.emp_code}</p>
        </div>
      </div>

      {/* Info rows card */}
      <div ref={cardsRef} className="space-y-3 mb-6">
        {/* Info card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
        >
          {infoRows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center gap-3 px-4 py-3.5 ${i < infoRows.length - 1 ? "border-b" : ""}`}
              style={{ borderColor: "oklch(1 0 0 / 0.07)" }}
            >
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <row.icon className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{row.label}</p>
                <p className="text-sm font-semibold truncate mt-0.5">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Appearance toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-colors active:scale-[0.98]"
          style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
              {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Appearance</p>
              <p className="text-sm font-semibold mt-0.5">{isDark ? "Dark mode" : "Light mode"}</p>
            </div>
          </div>
          {/* Toggle pill */}
          <div
            className="w-10 h-6 rounded-full relative transition-colors"
            style={{ background: isDark ? "oklch(0.65 0.22 264)" : "oklch(0.85 0.04 264)" }}
          >
            <div
              className="absolute top-1 size-4 rounded-full bg-white transition-all"
              style={{ left: isDark ? "calc(100% - 20px)" : "4px" }}
            />
          </div>
        </button>

        {/* Sign out */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={signOut}
          className="w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors"
          style={{
            background: "oklch(0.65 0.25 15 / 0.1)",
            border: "1px solid oklch(0.65 0.25 15 / 0.25)",
            color: "oklch(0.65 0.22 15)",
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </motion.button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-4 font-mono">
        Punch · v1.0
      </p>
    </div>
  );
}