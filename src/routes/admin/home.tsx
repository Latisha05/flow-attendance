import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/home")({
  head: () => ({ meta: [{ title: "Home — Admin" }] }),
  component: AdminHomePage,
});

function AdminHomePage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Home</h1>
      <p className="text-sm text-muted-foreground mt-1">Dashboard coming soon.</p>
    </div>
  );
}
