import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { getDashboard } from "@/lib/api/attendance.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Punch" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDash = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="px-6 pt-12">
      <h1 className="font-display text-3xl font-extrabold mb-8">Profile</h1>

      <div className="flex flex-col items-center text-center mb-10">
        <div className="size-20 rounded-3xl bg-foreground text-background flex items-center justify-center font-display text-2xl font-extrabold mb-4">
          {(data?.profile.full_name ?? "·")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("")}
        </div>
        <p className="font-display text-xl font-bold">{data?.profile.full_name || "—"}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">
          {data?.isAdmin ? "Admin" : "Employee"}
        </p>
      </div>


      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={signOut}
        className="w-full h-12 rounded-2xl bg-white border border-border font-semibold flex items-center justify-center gap-2 text-foreground"
      >
        <LogOut className="size-4" />
        Sign out
      </motion.button>

      <p className="text-center text-[10px] text-muted-foreground mt-8 font-mono">
        Punch · v1.0
      </p>
    </div>
  );
}