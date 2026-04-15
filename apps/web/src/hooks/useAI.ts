import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../lib/api";
import type { CategorizeResult } from "../lib/api";

export function useAnalyzeItem() {
  return useMutation({
    mutationFn: (itemId: string) => aiApi.analyze(itemId),
  });
}

export function useNextList() {
  return useQuery({
    queryKey: ["ai-next"],
    queryFn: () => aiApi.getNextList(),
    enabled: false,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours — matches KV TTL
  });
}

export function useRefreshNextList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => aiApi.getNextList(true),
    onSuccess: (data) => {
      qc.setQueryData(["ai-next"], data);
    },
  });
}

export function useCategorizeItem() {
  return useMutation<
    CategorizeResult,
    Error,
    { title: string; description?: string | null; sourceUrl?: string | null; contentType: string }
  >({
    mutationFn: (input) => aiApi.categorize(input),
  });
}
