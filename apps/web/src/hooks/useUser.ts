import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../lib/api";

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
