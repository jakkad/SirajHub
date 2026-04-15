import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ingestApi, itemsApi, type CreateItemInput, type UpdateItemInput } from "../lib/api";
import type { ContentTypeId, StatusId } from "../lib/constants";

const QUERY_KEY = "items";

export function useItems(filters?: { status?: StatusId; content_type?: ContentTypeId }) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => itemsApi.list(filters),
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemInput) => itemsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & UpdateItemInput) =>
      itemsApi.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useIngest() {
  return useMutation({
    mutationFn: (input: { url?: string; query?: string; content_type?: ContentTypeId }) =>
      ingestApi.fetch(input),
  });
}

export function useIngestSearch() {
  return useMutation({
    mutationFn: (input: { query: string; content_type: ContentTypeId }) => ingestApi.search(input),
  });
}

export function useResolveIngestSuggestion() {
  return useMutation({
    mutationFn: (suggestion: Parameters<typeof ingestApi.resolve>[0]) => ingestApi.resolve(suggestion),
  });
}
