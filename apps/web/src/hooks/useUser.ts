import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userApi, userSettingsApi, type AiPrompts, type InterestProfiles, type LabsSettings } from "../lib/api";

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: () => userApi.getMe(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; preferences?: string }) => userApi.updateMe(data),
    onSuccess: (updated) => {
      qc.setQueryData(["user-profile"], updated);
    },
  });
}

export function useClearAiCache() {
  return useMutation({
    mutationFn: () => userApi.clearAiCache(),
  });
}

export function useUserSettings() {
  return useQuery({
    queryKey: ["user-settings"],
    queryFn: () => userSettingsApi.getSettings(),
  });
}

export function useUpdateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ service, key }: { service: string; key: string }) =>
      userSettingsApi.updateKey(service, key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });
}

export function useTestApiKey() {
  return useMutation({
    mutationFn: ({ service, key }: { service: string; key?: string }) =>
      userSettingsApi.testKey(service, key),
  });
}

export function useTestAiModel() {
  return useMutation({
    mutationFn: ({ model, key }: { model: string; key?: string }) =>
      userSettingsApi.testModel(model, key),
  });
}

export function useUpdateInterestProfiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interestProfiles: InterestProfiles) =>
      userSettingsApi.updateInterestProfiles(interestProfiles),
    onSuccess: (result) => {
      qc.setQueryData(["user-settings"], (current: Awaited<ReturnType<typeof userSettingsApi.getSettings>> | undefined) =>
        current
          ? { ...current, interestProfiles: result.interestProfiles }
          : current
      );
      qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });
}

export function useUpdateAiPrompts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aiPrompts: AiPrompts) => userSettingsApi.updateAiPrompts(aiPrompts),
    onSuccess: (result) => {
      qc.setQueryData(["user-settings"], (current: Awaited<ReturnType<typeof userSettingsApi.getSettings>> | undefined) =>
        current
          ? { ...current, aiPrompts: result.aiPrompts }
          : current
      );
      qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });
}

export function useUpdateLabs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labs: LabsSettings) => userSettingsApi.updateLabs(labs),
    onSuccess: (result) => {
      qc.setQueryData(["user-settings"], (current: Awaited<ReturnType<typeof userSettingsApi.getSettings>> | undefined) =>
        current
          ? { ...current, labs: result.labs }
          : current
      );
      qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });
}
