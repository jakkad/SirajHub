import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ingestApi,
  itemsApi,
  savedViewsApi,
  type CreateItemInput,
  type ImportRowInput,
  type UpdateItemInput,
  type SavedViewFilters,
} from "../lib/api";
import type { ContentTypeId, StatusId } from "../lib/constants";

const QUERY_KEY = "items";
const IMPORT_SOURCES_QUERY_KEY = "import-sources";
const IMPORT_JOBS_QUERY_KEY = "import-jobs";
const SAVED_VIEWS_QUERY_KEY = "saved-views";
const DUPLICATES_QUERY_KEY = "duplicate-groups";

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

export function useImportItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ source, rows, resyncMetadata }: { source?: string; rows: ImportRowInput[]; resyncMetadata?: boolean }) =>
      source && source !== "csv" ? itemsApi.importSource(source, rows, resyncMetadata) : itemsApi.importCsv(rows, resyncMetadata),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [IMPORT_JOBS_QUERY_KEY] });
    },
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

export function useBulkDeleteItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => itemsApi.bulkDelete(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useMergeItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) => itemsApi.merge(sourceId, targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [DUPLICATES_QUERY_KEY] });
    },
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

export function useImportSources() {
  return useQuery({
    queryKey: [IMPORT_SOURCES_QUERY_KEY],
    queryFn: () => itemsApi.listImportSources(),
  });
}

export function useImportJobs() {
  return useQuery({
    queryKey: [IMPORT_JOBS_QUERY_KEY],
    queryFn: () => itemsApi.listImportJobs(),
  });
}

export function useDuplicateGroups() {
  return useQuery({
    queryKey: [DUPLICATES_QUERY_KEY],
    queryFn: () => itemsApi.listDuplicates(),
  });
}

export function useSavedViews(filters?: { scope?: "collection" | "dashboard"; content_type?: ContentTypeId }) {
  return useQuery({
    queryKey: [SAVED_VIEWS_QUERY_KEY, filters],
    queryFn: () => savedViewsApi.list(filters),
  });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      scope?: "collection" | "dashboard";
      contentType?: ContentTypeId | null;
      filters?: SavedViewFilters;
    }) => savedViewsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SAVED_VIEWS_QUERY_KEY] }),
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedViewsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SAVED_VIEWS_QUERY_KEY] }),
  });
}
