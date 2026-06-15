import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import { getCurrentUser, signIn } from "@/lib/auth";
import gsap from "gsap";

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

  // GSAP refs for orchestrated entrance
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);

  // Already logged in? Skip.
  useLayoutEffect(() => {
    if (getCurrentUser()) { navigate({ to: "/" }); return; }

    const tl = gsap.timeline({ delay: 0.1 });

    // 1. Logo
    if (logoRef.current) {
      tl.from(logoRef.current, {
        scale: 0.7,
        opacity: 0,
        duration: 0.55,
        ease: "back.out(1.7)",
      });
    }
    // 2. Title block
    if (titleRef.current) {
      tl.from(titleRef.current, {
        y: 12,
        opacity: 0,
        duration: 0.4,
        ease: "power3.out",
      }, "-=0.25");
    }
    // 3. Form fields stagger
    if (formRef.current) {
      tl.from(Array.from(formRef.current.children), {
        y: 10,
        opacity: 0,
        stagger: 0.07,
        duration: 0.38,
        ease: "power2.out",
      }, "-=0.15");
    }
    // 4. Footer
    if (footerRef.current) {
      tl.from(footerRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power1.out",
      }, "-=0.1");
    }
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
    } finally {
      setLoading(false);
    }
  }

  const sharedInputStyle: React.CSSProperties = {
    background: "oklch(1 0 0 / 0.05)",
    border: "1px solid oklch(1 0 0 / 0.1)",
    color: "inherit",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "oklch(0.65 0.22 264 / 0.6)";
    e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.65 0.22 264 / 0.15)";
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "oklch(1 0 0 / 0.1)";
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-6 mesh-bg"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div ref={logoRef} className="flex flex-col items-center mb-8">
          <div
            className="size-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, oklch(0.56 0.22 264), oklch(0.65 0.18 298))",
              boxShadow: "0 8px 32px oklch(0.65 0.22 264 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.2)",
            }}
          >
            {/* Custom hourglass/flow icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 22h14" /><path d="M5 2h14" />
              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
              <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
            </svg>
          </div>

          <div ref={titleRef} className="text-center">
            <h1 className="font-display text-3xl font-extrabold">FlowAttendance</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Sign in with your Employee ID</p>
          </div>
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
          <input
            required
            value={empCode}
            onChange={(e) => setEmpCode(e.target.value)}
            placeholder="Employee ID (e.g. EMP-0001)"
            autoCapitalize="characters"
            autoComplete="username"
            className="w-full h-12 px-4 rounded-2xl font-medium text-sm"
            style={sharedInputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full h-12 px-4 rounded-2xl font-medium text-sm"
            style={sharedInputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          {err && (
            <p
              className="text-xs px-3 py-2 rounded-xl"
              style={{
                background: "oklch(0.65 0.25 15 / 0.12)",
                color: "oklch(0.65 0.22 15)",
                border: "1px solid oklch(0.65 0.25 15 / 0.25)",
              }}
            >
              {err}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl font-semibold disabled:opacity-50 transition-opacity"
            style={{
              background: "linear-gradient(135deg, oklch(0.56 0.22 264), oklch(0.65 0.18 298))",
              color: "white",
              boxShadow: "0 4px 20px oklch(0.65 0.22 264 / 0.35)",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p ref={footerRef} className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an ID? Ask your admin to add you.
        </p>
      </div>
    </div>
  );
}
