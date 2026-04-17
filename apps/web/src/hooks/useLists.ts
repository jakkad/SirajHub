import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listsApi } from "../lib/api";

const LISTS_QUERY_KEY = "custom-lists";
const ITEM_LISTS_QUERY_KEY = "item-lists";

export function useLists() {
  return useQuery({
    queryKey: [LISTS_QUERY_KEY],
    queryFn: () => listsApi.list(),
  });
}

export function useList(listId: string | null) {
  return useQuery({
    queryKey: [LISTS_QUERY_KEY, listId],
    queryFn: () => listsApi.get(listId as string),
    enabled: Boolean(listId),
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) => listsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY] });
    },
  });
}

export function useReorderLists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => listsApi.reorder(orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY] });
    },
  });
}

export function useUpdateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string | null; color?: string }) =>
      listsApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, variables.id] });
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [ITEM_LISTS_QUERY_KEY] });
    },
  });
}

export function useItemLists(itemId: string | null) {
  return useQuery({
    queryKey: [ITEM_LISTS_QUERY_KEY, itemId],
    queryFn: () => listsApi.getItemLists(itemId as string),
    enabled: Boolean(itemId),
  });
}

export function useAddItemToList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, listId }: { itemId: string; listId: string }) => listsApi.addItem(itemId, listId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [ITEM_LISTS_QUERY_KEY, variables.itemId] });
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, variables.listId] });
    },
  });
}

export function useReorderListItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, orderedItemIds }: { listId: string; orderedItemIds: string[] }) =>
      listsApi.reorderItems(listId, orderedItemIds),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, variables.listId] });
    },
  });
}

export function useRemoveItemFromList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, listId }: { itemId: string; listId: string }) => listsApi.removeItem(itemId, listId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [ITEM_LISTS_QUERY_KEY, variables.itemId] });
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, variables.listId] });
    },
  });
}
