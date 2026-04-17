import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notesApi, type NoteEntry } from "../lib/api";

const NOTES_QUERY_KEY = "note-entries";

export function useNoteEntries(itemId: string | null) {
  return useQuery({
    queryKey: [NOTES_QUERY_KEY, itemId],
    queryFn: () => notesApi.list(itemId as string),
    enabled: Boolean(itemId),
  });
}

export function useCreateNoteEntry(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entryType: NoteEntry["entryType"]; content: string; context?: string }) => notesApi.create(itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, itemId] });
    },
  });
}

export function useUpdateNoteEntry(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; entryType?: NoteEntry["entryType"]; content?: string; context?: string | null }) =>
      notesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, itemId] });
    },
  });
}

export function useDeleteNoteEntry(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, itemId] });
    },
  });
}
