import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { getMyReports, submitReport } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import gsap from "gsap";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [{ title: "Work report — Punch" }] }),
  component: ReportPage,
});

// Badge variants with glow
function StatusBadge({ status }: { status: "reviewed" | "pending" }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase badge-${status}`}>
      {status}
    </span>
  );
}

// Animated history card
function HistoryCard({
  r,
  delay,
}: {
  r: { id: string; report_date: string; status: "reviewed" | "pending"; content: string };
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="p-4 rounded-2xl card-hero-border"
      style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.07)" }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <FileText className="size-3.5" />
          </div>
          <p className="font-bold text-sm">
            {new Date(r.report_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{r.content}</p>
    </motion.div>
  );
}

function ReportPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data } = useQuery({ queryKey: ["work-reports", userId], queryFn: () => getMyReports(userId) });

  const [content, setContent] = useState("");
  const [hours, setHours] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);

  // GSAP page entrance
  useLayoutEffect(() => {
    if (!headerRef.current) return;
    gsap.from(headerRef.current, { y: -16, opacity: 0, duration: 0.5, ease: "power3.out" });
  }, []);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Hydrate editor with today's saved report
  useEffect(() => {
    if (data?.today) {
      setContent(data.today.content);
      setHours(String(data.today.hours ?? ""));
    }
  }, [data?.today?.id]);

  useEffect(() => { autoResize(); }, [content, autoResize]);

  const locked = data?.today?.status === "reviewed";

  const mut = useMutation({
    mutationFn: () => submitReport(userId, content, Number(hours) || 0),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-reports", userId] });
      toast.success("Report saved ✓");
      // Button bounce on success
      if (submitBtnRef.current) {
        gsap.timeline()
          .to(submitBtnRef.current, { scale: 0.96, duration: 0.1, ease: "power2.in" })
          .to(submitBtnRef.current, { scale: 1, duration: 0.3, ease: "back.out(2)" });
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="px-6 pt-12">
      <h1 ref={headerRef} className="font-display text-3xl font-extrabold mb-6">Work report</h1>

      {/* Today's editor — hero card */}
      <div
        className="rounded-3xl p-5 mb-8 card-hero-border"
        style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.08)" }}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Today</p>
            <p className="font-display text-sm font-extrabold mt-0.5">{todayLabel}</p>
          </div>
          {data?.today && <StatusBadge status={data.today.status} />}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
          className="space-y-3"
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); autoResize(); }}
            disabled={locked}
            rows={5}
            maxLength={4000}
            placeholder="What did you work on today?"
            className="w-full px-3 py-2.5 rounded-2xl resize-none text-sm disabled:opacity-50 overflow-hidden outline-none transition-all duration-200"
            style={{
              background: "oklch(1 0 0 / 0.04)",
              border: "1px solid oklch(1 0 0 / 0.1)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = "1px solid oklch(0.65 0.22 264 / 0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.65 0.22 264 / 0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = "1px solid oklch(1 0 0 / 0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          <button
            ref={submitBtnRef}
            type="submit"
            disabled={mut.isPending || locked}
            className="w-full h-12 rounded-2xl font-semibold disabled:opacity-50 transition-opacity"
            style={{
              background: locked
                ? "oklch(1 0 0 / 0.1)"
                : "linear-gradient(135deg, oklch(0.56 0.22 264), oklch(0.65 0.18 298))",
              color: locked ? "oklch(0.6 0.02 264)" : "white",
              boxShadow: locked ? "none" : "0 4px 20px oklch(0.65 0.22 264 / 0.3)",
            }}
          >
            {locked ? "Reviewed — locked" : mut.isPending ? "Saving…" : data?.today ? "Update report" : "Submit report"}
          </button>
        </form>
      </div>

      {/* History */}
      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-3">History</p>
      <div className="space-y-2">
        {(data?.history ?? []).length === 0 && (
          <div
            className="p-6 text-center text-sm text-muted-foreground rounded-2xl"
            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.07)" }}
          >
            No reports yet. Start by submitting today's report above.
          </div>
        )}
        {(data?.history ?? []).map((r, i) => (
          <HistoryCard key={r.id} r={r} delay={i * 0.04} />
        ))}
      </div>
    </div>
  );
}
