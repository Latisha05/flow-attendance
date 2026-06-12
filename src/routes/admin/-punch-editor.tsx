import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { correctPunch, getEmployeeMonth } from "@/lib/api/admin.functions";
import { toast } from "sonner";

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function fmtHours(net: number | null) {
  if (net == null) return "—";
  return `${(net / 3600).toFixed(1)}h`;
}

export function PunchEditor({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const fetchMonth = useServerFn(getEmployeeMonth);
  const correctFn = useServerFn(correctPunch);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-month", userId, year, month],
    queryFn: () => fetchMonth({ data: { userId, year, month } }),
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; punch_in_at: string; punch_out_at: string | null }) => correctFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-month", userId] });
      onSaved();
      toast.success("Attendance corrected");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const rows = data?.rows ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonth((m) => m - 1)}
          className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
        >
          ‹
        </button>
        <span className="text-sm font-bold">{monthLabel}</span>
        <button
          onClick={() => setMonth((m) => Math.min(now.getMonth() + (year < now.getFullYear() ? 12 : 0), m + 1))}
          className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
        >
          ›
        </button>
      </div>

      {isFetching && <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>}
      {!isFetching && rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">No attendance this month.</p>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <PunchRow key={r.id} row={r} onSave={(v) => mut.mutate(v)} saving={mut.isPending} />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4">
        Net hours recalculate on save (1h break deducted for sessions ≥ 5h).
      </p>
    </div>
  );
}

function PunchRow({
  row,
  onSave,
  saving,
}: {
  row: { id: string; punch_in_at: string; punch_out_at: string | null; net_seconds: number | null };
  onSave: (v: { id: string; punch_in_at: string; punch_out_at: string | null }) => void;
  saving: boolean;
}) {
  const [inAt, setInAt] = useState(toLocalInput(row.punch_in_at));
  const [outAt, setOutAt] = useState(toLocalInput(row.punch_out_at));

  const dirty = inAt !== toLocalInput(row.punch_in_at) || outAt !== toLocalInput(row.punch_out_at);
  const dateLabel = new Date(row.punch_in_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold">{dateLabel}</span>
        <span className="text-[11px] font-mono text-muted-foreground">{fmtHours(row.net_seconds)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">In</span>
          <input
            type="datetime-local"
            value={inAt}
            onChange={(e) => setInAt(e.target.value)}
            className="mt-1 w-full h-10 px-2 rounded-xl bg-muted/50 border border-border text-xs"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Out</span>
          <input
            type="datetime-local"
            value={outAt}
            onChange={(e) => setOutAt(e.target.value)}
            className="mt-1 w-full h-10 px-2 rounded-xl bg-muted/50 border border-border text-xs"
          />
        </label>
      </div>
      {dirty && (
        <button
          onClick={() => {
            const inIso = fromLocalInput(inAt);
            if (!inIso) {
              toast.error("Punch-in time required");
              return;
            }
            onSave({ id: row.id, punch_in_at: inIso, punch_out_at: fromLocalInput(outAt) });
          }}
          disabled={saving}
          className="mt-2 w-full h-9 rounded-xl bg-foreground text-background text-xs font-bold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      )}
    </div>
  );
}
