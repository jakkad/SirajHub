import { useUserSettings } from "./useUser";

export function useLabs() {
  const { data: settings, isLoading } = useUserSettings();
  return {
    labs: settings?.labs ?? {
      lists: false,
      reminders: false,
      smartViews: false,
    },
    isLoading,
  };
}
