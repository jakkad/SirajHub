import { createFileRoute } from "@tanstack/react-router";
import { useItems } from "../hooks/useItems";
import { TypeStats } from "../components/dashboard/TypeStats";
import { RecentlyAdded } from "../components/dashboard/RecentlyAdded";
import { InProgressItems } from "../components/dashboard/InProgressItems";
import { NextToConsume } from "../components/dashboard/NextToConsume";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: allItems = [], isLoading } = useItems();

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Type stats ─────────────────────────────────────────────────────── */}
      <section>
        <TypeStats items={allItems} />
      </section>

      {/* ── In Progress ────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="In Progress" />
        {isLoading ? <Skeleton /> : <InProgressItems items={allItems} />}
      </section>

      {/* ── Bottom 2-col grid ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <section>
          <SectionHeader title="Recently Added" />
          {isLoading ? <Skeleton /> : <RecentlyAdded items={allItems} />}
        </section>

        <section>
          <SectionHeader title="Next to Consume" description="AI-ranked suggestions" />
          <NextToConsume />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--color-foreground)" }}>
        {title}
      </h2>
      {description && (
        <span style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2, display: "block" }}>
          {description}
        </span>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ height: 60, borderRadius: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
  );
}
