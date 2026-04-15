import { createFileRoute } from "@tanstack/react-router";
import { useItems } from "../hooks/useItems";
import { TypeStats } from "../components/dashboard/TypeStats";
import { RecentlyAdded } from "../components/dashboard/RecentlyAdded";
import { InProgressItems } from "../components/dashboard/InProgressItems";
import { NextToConsume } from "../components/dashboard/NextToConsume";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: allItems = [], isLoading } = useItems();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="soft-panel rounded-[34px] px-6 py-6 md:px-8 md:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="hero-kicker mb-3">Library overview</p>
              <h1 className="page-title text-foreground">
                One calm dashboard
                <br />
                for your whole media life.
              </h1>
              <p className="page-subtitle mt-4 max-w-xl">
                Track what you want to read, watch, and listen to with a cleaner control room built around your personal queue.
              </p>
            </div>
            <Badge variant="outline" className="bg-white">
              {allItems.length} items tracked
            </Badge>
          </div>

          <Badge variant="outline" className="mt-6 w-fit bg-white">
            {allItems.length} items tracked
          </Badge>
        </section>

        <div className="flex flex-col gap-6">
          <section className="soft-banner rounded-[30px] px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <span className="text-xl">✦</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-primary">Personal assistant layer</p>
                <p className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em] text-foreground">
                  Rank suggestions, tag faster, and keep your queue moving.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gemini-powered ranking and analysis are built into the same workspace as your library.
                </p>
              </div>
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
              <CardDescription>The items you are actively spending time with right now.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-24 w-full" /> : <InProgressItems items={allItems} />}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Library Types</CardTitle>
          <CardDescription>A clearer snapshot of how your saved items are distributed.</CardDescription>
        </CardHeader>
        <CardContent>
          <TypeStats items={allItems} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recently Added</CardTitle>
            <CardDescription>Your latest saves, ready to jump back into.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-36 w-full" /> : <RecentlyAdded items={allItems} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next To Consume</CardTitle>
            <CardDescription>AI-ranked suggestions pulled from your queue.</CardDescription>
          </CardHeader>
          <CardContent>
            <NextToConsume />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Rhythm</CardTitle>
            <CardDescription>A quick visual of how your library is distributed across the week.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 21 }).map((_, index) => {
                const active = index % 5 !== 0;
                return (
                  <div
                    key={index}
                    className="aspect-square rounded-2xl border border-[hsl(var(--border))]"
                    style={{
                      background: active
                        ? `color-mix(in oklab, hsl(var(--primary)) ${35 + (index % 4) * 15}%, white)`
                        : "hsl(var(--secondary))",
                    }}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Journey Snapshot</CardTitle>
            <CardDescription>Status mix across your full queue.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Suggestions", value: allItems.filter((item) => item.status === "suggestions").length, tone: "hsl(var(--primary))" },
              { label: "In Progress", value: allItems.filter((item) => item.status === "in_progress").length, tone: "hsl(var(--accent))" },
              { label: "Finished", value: allItems.filter((item) => item.status === "finished").length, tone: "hsl(var(--success))" },
              { label: "Archived", value: allItems.filter((item) => item.status === "archived").length, tone: "hsl(var(--warm-accent))" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.45)] p-5">
                <p className="metric-label">{metric.label}</p>
                <div className="metric-value mt-3" style={{ color: metric.tone }}>{metric.value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
