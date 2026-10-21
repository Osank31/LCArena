import { useSyncExternalStore } from "react";
import { backendStatus } from "../services/backendStatus";

export interface BackendStatusState {
  status: "checking" | "online" | "offline";
  isOnline: boolean;
  isOffline: boolean;
  recheck: () => Promise<boolean>;
}

/**
 * Subscribe a component to the detected backend availability so demo-only UI
 * (apology banner, demo badges, offline notices) is rendered only when the
 * backend is genuinely unreachable.
 */
export const useBackendStatus = (): BackendStatusState => {
  const status = useSyncExternalStore(
    backendStatus.subscribe,
    backendStatus.getStatus,
    backendStatus.getStatus
  );

  return {
    status,
    isOnline: status === "online",
    isOffline: status === "offline",
    recheck: backendStatus.check,
  };
};
