import { useState } from "react";
import { useItems } from "../../hooks/useItems";
import type { ContentTypeId, StatusId } from "../../lib/constants";
import { STATUSES } from "../../lib/constants";
import type { Item } from "../../lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TypePageLayoutProps {
  contentType: ContentTypeId;
  title: string;
  color: string;
  icon: string;
  children: (items: Item[]) => React.ReactNode;
}

const STATUS_FILTERS: Array<{ id: StatusId | "all"; label: string }> = [
  { id: "all", label: "All" },
  ...STATUSES.map((s) => ({ id: s.id, label: s.label })),
];

export function TypePageLayout({ contentType, title, color, icon, children }: TypePageLayoutProps) {
  const [statusFilter, setStatusFilter] = useState<StatusId | "all">("all");
  const { data: allItems = [], isLoading } = useItems({ content_type: contentType });

  const filtered = statusFilter === "all"
    ? allItems
    : allItems.filter((i) => i.status === statusFilter);

  const countByStatus = (id: StatusId | "all") =>
    id === "all" ? allItems.length : allItems.filter((i) => i.status === id).length;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-[22px] bg-secondary shadow-[var(--shadow-subtle)]">
              <span className="text-4xl">{icon}</span>
            </div>
            <div>
              <p className="hero-kicker mb-1 text-xs">Collection View</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[2.5rem] font-semibold leading-none tracking-[-0.05em]" style={{ color }}>{title}</h1>
                <Badge variant="outline">{allItems.length} saved</Badge>
              </div>
            </div>
          </div>

          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusId | "all")}>
            <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0 shadow-none">
              {STATUS_FILTERS.map((sf) => {
                const count = countByStatus(sf.id);
                if (sf.id !== "all" && count === 0) return null;
                return (
                  <TabsTrigger key={sf.id} value={sf.id} className="border border-[hsl(var(--border))] bg-card shadow-none data-[state=active]:bg-secondary">
                    {sf.label} <span className="ml-1 text-muted-foreground">{count}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading ? <Skeleton className="h-48 w-full" /> : children(filtered)}
    </div>
  );
}
