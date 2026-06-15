import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getCurrentUser, signIn } from "@/lib/auth";
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const logoRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (getCurrentUser()) { navigate({ to: "/" }); return; }

    // Reset opacity to a known state before animating (fixes React 18 Strict
    // Mode double-invocation: the second run would otherwise capture the
    // mid-animation opacity as the target value and freeze elements invisible).
    gsap.set(logoRef.current, { opacity: 0, scale: 0.6 });
    gsap.set(cardRef.current, { opacity: 0, y: 24 });
    if (fieldsRef.current?.children) {
      gsap.set(fieldsRef.current.children, { opacity: 0, y: 16 });
    }

    // GSAP entrance: logo springs in, then card + fields stagger up
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signIn(empCode, password);
      navigate({ to: "/" });
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
      // Horizontal shake on error
      gsap.fromTo(formRef.current,
        { x: 0 },
        { x: [-10, 10, -8, 8, -5, 5, 0], duration: 0.45, ease: "power2.inOut" }
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 bg-background relative overflow-hidden">
      {/* Ambient orb blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-primary opacity-[0.07] blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-accent opacity-[0.08] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
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

        {/* Card */}
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
                  placeholder="e.g. EMP-0001"
                  autoCapitalize="characters"
                  autoComplete="username"
                  className="mt-1.5 w-full h-13 px-4 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Password</span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="mt-1.5 w-full h-13 px-4 rounded-2xl bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition text-sm"
                />
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
