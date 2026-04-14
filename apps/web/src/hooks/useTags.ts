import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tagsApi, type Tag } from "../lib/api";

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => tagsApi.list(),
  });
}

export function useItemTags(itemId: string | null) {
  return useQuery({
    queryKey: ["item-tags", itemId],
    queryFn: () => tagsApi.getItemTags(itemId!),
    enabled: !!itemId,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => tagsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["item-tags"] });
    },
  });
}

export function useAddTagToItem(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => tagsApi.addToItem(itemId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["item-tags", itemId] }),
  });
}

export function useRemoveTagFromItem(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => tagsApi.removeFromItem(itemId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["item-tags", itemId] }),
  });
}

// Tag color palette for the UI picker
export const TAG_COLORS: { label: string; value: string }[] = [
  { label: "Indigo",  value: "#6366f1" },
  { label: "Violet",  value: "#8b5cf6" },
  { label: "Pink",    value: "#ec4899" },
  { label: "Red",     value: "#ef4444" },
  { label: "Orange",  value: "#f97316" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Green",   value: "#22c55e" },
  { label: "Teal",    value: "#14b8a6" },
  { label: "Sky",     value: "#38bdf8" },
  { label: "Gray",    value: "#94a3b8" },
];

export type { Tag };
