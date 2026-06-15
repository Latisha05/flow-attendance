import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/admin/salary")({
  head: () => ({ meta: [{ title: "Salary - Admin" }] }),
  component: SalaryPage,
});

function SalaryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold">Salary</h1>
        <p className="text-sm text-muted-foreground mt-1">This section is ready and intentionally empty for now.</p>
      </div>

      <div className="bg-white border border-border rounded-2xl p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Wallet className="size-4" />
          </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Coming next</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Salary tools and records will live here once you want to add them.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
