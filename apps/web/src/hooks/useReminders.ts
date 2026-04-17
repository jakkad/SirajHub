import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { remindersApi, type Reminder } from "../lib/api";

const REMINDERS_QUERY_KEY = "reminders";

export function useReminders() {
  return useQuery({
    queryKey: [REMINDERS_QUERY_KEY],
    queryFn: () => remindersApi.list(),
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, type, action }: { itemId: string; type: Reminder["type"]; action: "dismiss" | "snooze" | "clear" }) =>
      remindersApi.update(itemId, type, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [REMINDERS_QUERY_KEY] });
    },
  });
}
