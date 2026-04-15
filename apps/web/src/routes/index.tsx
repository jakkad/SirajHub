import { createFileRoute } from "@tanstack/react-router";
import { useItems } from "../hooks/useItems";
import { TypeStats } from "../components/dashboard/TypeStats";
import { RecentlyAdded } from "../components/dashboard/RecentlyAdded";
import { InProgressItems } from "../components/dashboard/InProgressItems";
import { NextToConsume } from "../components/dashboard/NextToConsume";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: allItems = [], isLoading } = useItems();

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[40px] border-2 border-[hsl(var(--border-strong))] bg-[hsl(var(--background)/0.8)] px-6 py-10 shadow-[8px_8px_0_hsl(var(--shadow-ink))]">
        <p className="hero-kicker mb-4 text-center text-xs">Running in public</p>
        <h1 className="hero-title mx-auto max-w-4xl text-center text-5xl leading-none text-foreground sm:text-6xl lg:text-7xl">
          Your media stack.
          <br />
          <span className="hero-accent">One library.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center font-display text-2xl text-muted-foreground">
          Track books, films, podcasts, videos, articles, and tweets in one playful command center.
        </p>
      </section>

      <section>
        <TypeStats items={allItems} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>In Progress</CardTitle>
          <CardDescription>The things you are actively reading, watching, or listening to right now.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-24 w-full" /> : <InProgressItems items={allItems} />}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
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
    </div>
  );
}
