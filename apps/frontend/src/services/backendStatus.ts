import axios from "axios";
import { apiClient } from "./apiClient";

/**
 * LCArena is shipped both as a hosted frontend-only demo and as a full
 * Docker Compose stack. Instead of hardcoding "demo mode", the client probes
 * the Gateway health endpoint and exposes the result here so every service and
 * component can react to the *actual* backend availability.
 */
export type BackendStatus = "checking" | "online" | "offline";

const HEALTH_ENDPOINT = "/health";
const HEALTH_TIMEOUT_MS = 4000;
/** While offline, poll so a backend started later is picked up automatically. */
const OFFLINE_RECHECK_MS = 15000;

let currentStatus: BackendStatus = "checking";
let inFlightCheck: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function setStatus(next: BackendStatus): void {
  if (currentStatus === next) return;
  currentStatus = next;
  listeners.forEach((listener) => listener());
}

/** True when the request never reached the server (DNS/refused/timeout). */
export function isConnectivityError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

export const backendStatus = {
  getStatus(): BackendStatus {
    return currentStatus;
  },

  isOnline(): boolean {
    return currentStatus === "online";
  },

  isOffline(): boolean {
    return currentStatus === "offline";
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  markOnline(): void {
    setStatus("online");
  },

  markOffline(): void {
    setStatus("offline");
  },

  /** Test helper: forget any previously detected status. */
  reset(): void {
    inFlightCheck = null;
    setStatus("checking");
  },

  /**
   * Ping the Gateway. Concurrent callers share a single request; the result
   * transitions the shared status and notifies subscribers.
   */
  check(): Promise<boolean> {
    if (inFlightCheck) return inFlightCheck;

    inFlightCheck = (async () => {
      try {
        await apiClient.get(HEALTH_ENDPOINT, { timeout: HEALTH_TIMEOUT_MS });
        setStatus("online");
        return true;
      } catch {
        setStatus("offline");
        return false;
      } finally {
        inFlightCheck = null;
      }
    })();

    return inFlightCheck;
  },

  /**
   * Resolve the current status before a data request: an in-flight/unknown
   * status is probed, an already-known status is used as-is.
   */
  async ensureChecked(): Promise<boolean> {
    if (currentStatus === "online") return true;
    if (currentStatus === "offline") return false;
    return backendStatus.check();
  },

  /**
   * Keep the detected status fresh for the lifetime of the app. Returns a
   * cleanup function. Network failures raised by the API client flip the
   * status to offline immediately; while offline, a light poll detects the
   * backend coming back up without a page reload.
   */
  watch(): () => void {
    if (typeof window === "undefined") return () => {};

    void backendStatus.check();

    const handleConnectionError = () => backendStatus.markOffline();
    const handleBrowserOnline = () => {
      void backendStatus.check();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !backendStatus.isOnline()) {
        void backendStatus.check();
      }
    };

    window.addEventListener("lcarena:server-connection-error", handleConnectionError);
    window.addEventListener("online", handleBrowserOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (!backendStatus.isOnline()) {
        void backendStatus.check();
      }
    }, OFFLINE_RECHECK_MS);

    return () => {
      window.removeEventListener("lcarena:server-connection-error", handleConnectionError);
      window.removeEventListener("online", handleBrowserOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  },
};
