import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../lib/api";
import type { CategorizeResult } from "../lib/api";

export function useSavedAnalysis(itemId: string, enabled = true) {
  return useQuery({
    queryKey: ["ai-analysis", itemId],
    queryFn: () => aiApi.getAnalysis(itemId),
    enabled,
    refetchInterval: (query) => {
      const state = query.state.data;
      return state?.job && ["queued", "processing"].includes(state.job.status) ? 30000 : false;
    },
  });
}

export function useAnalyzeItem(itemId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetItemId: string) => aiApi.analyze(targetItemId),
    onSuccess: (_, targetItemId) => {
      qc.invalidateQueries({ queryKey: ["ai-analysis", itemId ?? targetItemId] });
    },
  });
}

export function useNextList() {
  return useQuery({
    queryKey: ["ai-next"],
    queryFn: () => aiApi.getNextList(),
    refetchInterval: (query) => {
      const state = query.state.data;
      return state?.job && ["queued", "processing"].includes(state.job.status) ? 30000 : false;
    },
  });
}

export function useRefreshNextList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => aiApi.queueNextList(),
    onSuccess: (data) => {
      qc.setQueryData(["ai-next"], data);
      qc.invalidateQueries({ queryKey: ["ai-next"] });
    },
  });
}

export function useAiJobs() {
  return useQuery({
    queryKey: ["ai-jobs"],
    queryFn: () => aiApi.listJobs(),
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs ?? [];
      return jobs.some((job) => ["queued", "processing"].includes(job.status)) ? 15000 : false;
    },
  });
}

export function useRetryAiJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => aiApi.retryJob(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-jobs"] });
      qc.invalidateQueries({ queryKey: ["ai-next"] });
      qc.invalidateQueries({ queryKey: ["ai-analysis"] });
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
