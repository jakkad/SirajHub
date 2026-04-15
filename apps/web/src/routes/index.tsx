import { createFileRoute } from "@tanstack/react-router";
import { useItems } from "../hooks/useItems";
import { TypeStats } from "../components/dashboard/TypeStats";
import { RecentlyAdded } from "../components/dashboard/RecentlyAdded";
import { InProgressItems } from "../components/dashboard/InProgressItems";
import { NextToConsume } from "../components/dashboard/NextToConsume";
import { CONTENT_TYPES } from "../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: allItems = [], isLoading } = useItems();
  const suggestions = allItems.filter((item) => item.status === "suggestions");
  const inProgress = allItems.filter((item) => item.status === "in_progress");
  const finished = allItems.filter((item) => item.status === "finished");
  const archived = allItems.filter((item) => item.status === "archived");
  const completionRate = allItems.length > 0 ? Math.round((finished.length / allItems.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <section className="soft-panel min-w-0 rounded-[34px] px-6 py-6 md:px-8 md:py-8">
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
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <MetricTile label="Items tracked" value={allItems.length} tone="hsl(var(--primary))" />
            <MetricTile label="Active now" value={inProgress.length} tone="hsl(var(--accent))" />
            <MetricTile label="Completion rate" value={`${completionRate}%`} tone="hsl(var(--success))" />
          </div>
        </section>

        <div className="min-w-0 flex flex-col gap-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
              <CardDescription>The items you are actively spending time with right now.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-24 w-full" /> : <InProgressItems items={allItems} />}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Next To Consume</CardTitle>
                <CardDescription>AI-ranked suggestions pulled from your queue.</CardDescription>
              </div>
              <Badge variant="secondary">{suggestions.length} queued</Badge>
            </CardHeader>
            <CardContent>
              <NextToConsume />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Library Types</CardTitle>
          <CardDescription>A clearer snapshot of how your saved items are distributed.</CardDescription>
        </CardHeader>
        <CardContent>
          <TypeStats items={allItems} />
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="min-w-0 h-auto self-start overflow-hidden">
          <CardHeader>
            <CardTitle>Recently Added</CardTitle>
            <CardDescription>Your latest saves, ready to jump back into.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            {isLoading ? <Skeleton className="h-36 w-full" /> : <RecentlyAdded items={allItems} />}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Library Snapshot</CardTitle>
            <CardDescription>A quick read on the current shape of your queue.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 grid-cols-2">
            <MetricTile label="Suggestions" value={suggestions.length} tone="hsl(var(--primary))" />
            <MetricTile label="In Progress" value={inProgress.length} tone="hsl(var(--accent))" />
            <MetricTile label="Finished" value={finished.length} tone="hsl(var(--success))" />
            <MetricTile label="Archived" value={archived.length} tone="hsl(var(--warm-accent))" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Collection Momentum</CardTitle>
            <CardDescription>Where the library is gaining weight right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Suggestion backlog", value: suggestions.length, total: Math.max(allItems.length, 1), tone: "hsl(var(--primary))" },
              { label: "Currently active", value: inProgress.length, total: Math.max(allItems.length, 1), tone: "hsl(var(--accent))" },
              { label: "Completed items", value: finished.length, total: Math.max(allItems.length, 1), tone: "hsl(var(--success))" },
            ].map((metric) => {
              const width = `${Math.max((metric.value / metric.total) * 100, metric.value > 0 ? 8 : 0)}%`;
              return (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{metric.label}</p>
                    <span className="text-sm text-muted-foreground">{metric.value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[hsl(var(--secondary))]">
                    <div className="h-full rounded-full" style={{ width, background: metric.tone }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Recently Finished</CardTitle>
            <CardDescription>The latest items you have wrapped up.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {finished.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nothing finished yet.</div>
            ) : (
              [...finished]
                .sort((a, b) => (b.finishedAt ?? b.updatedAt) - (a.finishedAt ?? a.updatedAt))
                .slice(0, 4)
                .map((item) => {
                  const contentType = CONTENT_TYPES.find((entry) => entry.id === item.contentType);
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-3">
                      <div className="cover-frame flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px]">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl">{contentType?.icon ?? "•"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                        {item.creator ? <p className="truncate text-xs text-muted-foreground">{item.creator}</p> : null}
                      </div>
                      <Badge variant="secondary">done</Badge>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricTile({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.45)] p-4">
      <p className="metric-label break-words">{label}</p>
      <div className="metric-value mt-3" style={{ color: tone }}>{value}</div>
    </div>
  );
}
