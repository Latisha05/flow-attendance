import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { getMyReports, submitReport } from "@/lib/api/work-reports.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [{ title: "Work report — Punch" }] }),
  component: ReportPage,
});

const statusStyles = {
  reviewed: "bg-green-50 text-green-700",
  pending: "bg-yellow-50 text-yellow-700",
} as const;

function ReportPage() {
  const qc = useQueryClient();
  const fetchReports = useServerFn(getMyReports);
  const submit = useServerFn(submitReport);
  const { data } = useQuery({ queryKey: ["work-reports"], queryFn: () => fetchReports() });

  const [content, setContent] = useState("");
  const [hours, setHours] = useState("");

  // Hydrate the editor with today's saved report when it loads.
  useEffect(() => {
    if (data?.today) {
      setContent(data.today.content);
      setHours(String(data.today.hours ?? ""));
    }
  }, [data?.today?.id]);

  const locked = data?.today?.status === "reviewed";

  const mut = useMutation({
    mutationFn: () => submit({ data: { content, hours: Number(hours) || 0 } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-reports"] });
      toast.success("Report saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="px-6 pt-12">
      <h1 className="font-display text-3xl font-extrabold mb-6">Work report</h1>

      {/* Today's editor */}
      <div className="bg-white border border-border rounded-3xl p-5 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Today</p>
            <p className="font-display text-sm font-extrabold mt-0.5">{todayLabel}</p>
          </div>
          {data?.today && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusStyles[data.today.status]}`}>
              {data.today.status}
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-3"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={locked}
            rows={5}
            maxLength={4000}
            placeholder="What did you work on today?"
            className="w-full px-3 py-2.5 rounded-2xl bg-muted/50 border border-border resize-none text-sm disabled:opacity-60"
          />

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={mut.isPending || locked}
            className="w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50"
          >
            {locked ? "Reviewed — locked" : mut.isPending ? "…" : data?.today ? "Update report" : "Submit report"}
          </motion.button>
        </form>
      </div>

      {/* History */}
      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-3">History</p>
      <div className="space-y-2">
        {(data?.history ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground bg-white border border-border rounded-2xl">
            No reports yet.
          </div>
        )}
        {(data?.history ?? []).map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="p-4 rounded-2xl bg-white border border-border"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="size-3.5" />
                </div>
                <p className="font-bold text-sm">
                  {new Date(r.report_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyles[r.status]}`}>
                {r.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{r.content}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
