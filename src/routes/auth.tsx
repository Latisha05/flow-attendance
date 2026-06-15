import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { getCurrentUser, signIn, setupCredentials, skipFirstLoginSetup } from "@/lib/auth";
import { gsap } from "gsap";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — FlowAttendance" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [empCode, setEmpCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const logoRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (getCurrentUser()) { navigate({ to: "/" }); return; }

    gsap.set(logoRef.current, { opacity: 0, scale: 0.6 });
    gsap.set(cardRef.current, { opacity: 0, y: 24 });
    if (fieldsRef.current?.children) {
      gsap.set(fieldsRef.current.children, { opacity: 0, y: 16 });
    }

    const tl = gsap.timeline();
    tl.to(logoRef.current, {
      scale: 1, opacity: 1, duration: 0.55,
      ease: "back.out(1.7)",
    })
    .to(cardRef.current, {
      y: 0, opacity: 1, duration: 0.45,
      ease: "power3.out",
    }, "-=0.2")
    .to(fieldsRef.current?.children ?? [], {
      y: 0, opacity: 1, stagger: 0.07,
      ease: "power2.out", duration: 0.4,
    }, "-=0.25");

    return () => { tl.kill(); };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const user = await signIn(empCode, password);
      if (user.isFirstLogin) {
        setShowSetup(true);
      } else {
        navigate({ to: "/" });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setErr(msg);
      gsap.fromTo(formRef.current,
        { x: 0 },
        { x: "-=10", duration: 0.45, ease: "power2.inOut", yoyo: true, repeat: 5 }
      );
    } finally {
      setLoading(false);
    }
  }

  if (showSetup) {
    return <FirstLoginSetup onDone={() => navigate({ to: "/" })} />;
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-primary opacity-[0.07] blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-accent opacity-[0.08] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div ref={logoRef} className="flex flex-col items-center mb-8">
          <div
            className="inline-flex size-16 rounded-2xl items-center justify-center shadow-lg shadow-primary/25 mb-4"
            style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
          >
            <div className="size-7 rounded-full border-[3px] border-white border-t-transparent rotate-45" />
          </div>
          <h1 className="font-display text-3xl font-extrabold">FlowAttendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in with your Employee ID</p>
        </div>

        <div
          ref={cardRef}
          className="bg-white rounded-3xl p-7 border border-border"
          style={{ boxShadow: "0 24px 60px rgba(79, 70, 229, 0.10), 0 4px 16px rgba(0,0,0,0.05)" }}
        >
          <form ref={formRef} onSubmit={onSubmit} className="space-y-1">
            <div ref={fieldsRef} className="space-y-4">
              <label className="block">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Employee ID</span>
                <input
                  required
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  placeholder="e.g. EMP-K7M4Q9"
                  autoCapitalize="characters"
                  autoComplete="username"
                  className="mt-1.5 w-full h-13 px-4 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Password</span>
                <div className="relative mt-1.5">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className="w-full h-13 px-4 pr-11 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              {err && (
                <p className="text-xs text-destructive px-1 font-medium">{err}</p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={loading}
                className="w-full h-13 rounded-2xl font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))",
                  boxShadow: "0 8px 24px rgba(79, 70, 229, 0.30)",
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </motion.button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Don't have an ID? Ask your admin to add you.
        </p>
      </div>
    </div>
  );
}

function FirstLoginSetup({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (newPassword !== confirm) { setErr("Passwords do not match"); return; }
    if (newPassword.length < 6) { setErr("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await setupCredentials(email, newPassword);
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onSkip() {
    setLoading(true);
    try {
      await skipFirstLoginSetup();
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-primary opacity-[0.07] blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-accent opacity-[0.08] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div
            className="inline-flex size-16 rounded-2xl items-center justify-center shadow-lg shadow-primary/25 mb-4"
            style={{ background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))" }}
          >
            <div className="size-7 rounded-full border-[3px] border-white border-t-transparent rotate-45" />
          </div>
          <h1 className="font-display text-3xl font-extrabold">Welcome!</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">Set up your email and password</p>
        </div>

        <div
          className="bg-white rounded-3xl p-7 border border-border"
          style={{ boxShadow: "0 24px 60px rgba(79, 70, 229, 0.10), 0 4px 16px rgba(0,0,0,0.05)" }}
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-1.5 w-full h-13 px-4 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary">New Password</span>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Choose a password"
                  autoComplete="new-password"
                  className="w-full h-13 px-4 pr-11 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
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
            </label>

            <label className="block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Confirm Password</span>
              <div className="relative mt-1.5">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="w-full h-13 px-4 pr-11 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
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
            </label>

            {err && (
              <p className="text-xs text-destructive px-1 font-medium">{err}</p>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="w-full h-13 rounded-2xl font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{
                background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(258 80% 68%))",
                boxShadow: "0 8px 24px rgba(79, 70, 229, 0.30)",
              }}
            >
              {loading ? "Saving…" : "Save & Continue"}
            </motion.button>

            <button
              type="button"
              onClick={onSkip}
              disabled={loading}
              className="w-full h-10 rounded-2xl font-medium text-muted-foreground text-sm hover:text-foreground transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          You can update your credentials later from your profile.
        </p>
      </div>
    </div>
  );
}
