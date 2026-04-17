import { Link } from "@tanstack/react-router";
import { useReminders, useUpdateReminder } from "../../hooks/useReminders";
import { CONTENT_TYPES } from "../../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ReminderInbox({ limit }: { limit?: number } = {}) {
  const { data, isLoading } = useReminders();
  const { mutate: updateReminder, isPending } = useUpdateReminder();

  const reminders = (data?.reminders ?? []).slice(0, limit ?? Number.MAX_SAFE_INTEGER);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (reminders.length === 0) {
    return <div className="text-sm text-muted-foreground">No active reminders right now.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {reminders.map((reminder) => {
        const contentType = CONTENT_TYPES.find((entry) => entry.id === reminder.item.contentType);
        return (
          <div key={reminder.id} className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{reminder.title}</p>
                  {contentType ? <Badge variant="outline">{contentType.label}</Badge> : null}
                  <Badge variant="secondary">{reminder.ageDays}d</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{reminder.message}</p>
              </div>

              <Link
                to="/item/$id"
                params={{ id: reminder.item.id }}
                className="rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-sm font-medium text-foreground no-underline hover:bg-card"
              >
                Open item
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => updateReminder({ itemId: reminder.item.id, type: reminder.type, action: "snooze" })}
              >
                Snooze 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => updateReminder({ itemId: reminder.item.id, type: reminder.type, action: "dismiss" })}
              >
                Dismiss
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
