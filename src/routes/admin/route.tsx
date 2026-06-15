import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Home, Users, FileText, CalendarOff, Clock, ArrowLeft } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  // Unauthenticated for now — open access to the web admin panel.
  component: AdminLayout,
});

const nav = [
  { to: "/admin/home", label: "Home", icon: Home },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/reports", label: "Work reports", icon: FileText },
  { to: "/admin/leave", label: "Leave", icon: CalendarOff },
  { to: "/admin/attendance", label: "Attendance", icon: Clock },
];

function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-white">
        <div className="px-6 py-6 border-b border-border">
          <p className="font-display text-xl font-extrabold tracking-tight">FlowAttendance</p>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4" />
            Employee app
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-border flex items-center gap-1 px-2 py-2 overflow-x-auto">
        {nav.map((n) => {
          const active = location.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                active ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 min-w-0 overflow-x-hidden pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
