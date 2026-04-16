import { useState } from "react";
import { useItems } from "../../hooks/useItems";
import type { ContentTypeId, StatusId } from "../../lib/constants";
import { STATUSES } from "../../lib/constants";
import type { Item } from "../../lib/api";
import { NextToConsume } from "../dashboard/NextToConsume";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TypePageLayoutProps {
  contentType: ContentTypeId;
  title: string;
  color: string;
  children: (items: Item[]) => React.ReactNode;
}

const STATUS_FILTERS: Array<{ id: StatusId | "all"; label: string }> = [
  { id: "all", label: "All" },
  ...STATUSES.map((s) => ({ id: s.id, label: s.label })),
];

export function TypePageLayout({ contentType, title, color, children }: TypePageLayoutProps) {
  const [statusFilter, setStatusFilter] = useState<StatusId | "all">("all");
  const { data: allItems = [], isLoading } = useItems({ content_type: contentType });

  const filtered = statusFilter === "all"
    ? allItems
    : allItems.filter((i) => i.status === statusFilter);

  const countByStatus = (id: StatusId | "all") =>
    id === "all" ? allItems.length : allItems.filter((i) => i.status === id).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <h1 className="text-[2.75rem] font-semibold leading-none tracking-[-0.05em]" style={{ color }}>{title}</h1>
          <Badge variant="outline">{allItems.length} saved</Badge>
        </div>

        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusId | "all")}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Filter by status
              </p>
              <Badge variant="secondary" className="bg-card/80 text-muted-foreground">
                {filtered.length} shown
              </Badge>
            </div>

            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-[24px] border border-[hsl(var(--border))] bg-card/80 p-2 shadow-none">
              {STATUS_FILTERS.map((sf) => {
                const count = countByStatus(sf.id);
                if (sf.id !== "all" && count === 0) return null;
                return (
                  <TabsTrigger
                    key={sf.id}
                    value={sf.id}
                    className="rounded-[18px] border border-transparent bg-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-[hsl(var(--border))] data-[state=active]:bg-[hsl(var(--secondary))] data-[state=active]:text-foreground"
                  >
                    <span>{sf.label}</span>
                    <span className="ml-2 rounded-full bg-card/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </Tabs>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-8 p-6">
          {!isLoading ? (
            <div className="border-b border-[hsl(var(--border))] pb-6">
              <NextToConsume
                contentType={contentType}
                title={`${title} Next To Consume`}
                description={`Top suggestion scores for your ${title.toLowerCase()} queue.`}
              />
            </div>
          ) : null}

          {isLoading ? <Skeleton className="h-48 w-full" /> : children(filtered)}
        </CardContent>
      </Card>
    </div>
  );
}
