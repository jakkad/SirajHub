import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../lib/api";

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

export function useScoreItem(itemId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetItemId: string) => aiApi.score(targetItemId),
    onSuccess: (_, targetItemId) => {
      qc.invalidateQueries({ queryKey: ["ai-jobs"] });
      qc.invalidateQueries({ queryKey: ["ai-next"] });
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useNextList(contentType?: string) {
  return useQuery({
    queryKey: ["ai-next", contentType ?? "all"],
    queryFn: () => aiApi.getNextList(contentType),
    refetchInterval: (query) => {
      const state = query.state.data;
      return state?.job && ["queued", "processing"].includes(state.job.status) ? 30000 : false;
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

export function useRepeatAiJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => aiApi.repeatJob(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-jobs"] });
      qc.invalidateQueries({ queryKey: ["ai-next"] });
      qc.invalidateQueries({ queryKey: ["ai-analysis"] });
    },
  });
}

export function useDeleteAiJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => aiApi.deleteJob(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-jobs"] });
      qc.invalidateQueries({ queryKey: ["ai-next"] });
      qc.invalidateQueries({ queryKey: ["ai-analysis"] });
    },
  });
}
