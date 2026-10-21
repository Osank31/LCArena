import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../services/apiClient";
import { backendStatus, isConnectivityError } from "../../services/backendStatus";

const networkError = () => {
  const error = new Error("Network Error") as Error & { isAxiosError: boolean };
  error.isAxiosError = true;
  return error;
};

const serverError = () => {
  const error = new Error("Request failed with status code 500") as Error & {
    isAxiosError: boolean;
    response: { status: number };
  };
  error.isAxiosError = true;
  error.response = { status: 500 };
  return error;
};

describe("backendStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backendStatus.reset();
  });

  it("marks the backend online when the health endpoint responds", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce({ data: { message: "Gateway Healthy" } });

    await expect(backendStatus.check()).resolves.toBe(true);

    expect(getSpy).toHaveBeenCalledWith("/health", expect.any(Object));
    expect(backendStatus.getStatus()).toBe("online");
    expect(backendStatus.isOnline()).toBe(true);
    expect(backendStatus.isOffline()).toBe(false);
  });

  it("marks the backend offline when the health endpoint is unreachable", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(networkError());

    await expect(backendStatus.check()).resolves.toBe(false);

    expect(backendStatus.getStatus()).toBe("offline");
    expect(backendStatus.isOffline()).toBe(true);
  });

  it("shares a single health request between concurrent callers", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: { message: "Gateway Healthy" } });

    const [first, second] = await Promise.all([
      backendStatus.check(),
      backendStatus.check(),
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it("re-probes after a previous check has settled", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ data: { message: "Gateway Healthy" } });

    await expect(backendStatus.check()).resolves.toBe(false);
    await expect(backendStatus.check()).resolves.toBe(true);

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(backendStatus.getStatus()).toBe("online");
  });

  it("notifies subscribers only when the status actually changes", () => {
    const listener = vi.fn();
    const unsubscribe = backendStatus.subscribe(listener);

    backendStatus.markOnline();
    backendStatus.markOnline();
    expect(listener).toHaveBeenCalledTimes(1);

    backendStatus.markOffline();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    backendStatus.markOnline();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ensureChecked reuses a known online status without probing again", async () => {
    backendStatus.markOnline();
    const getSpy = vi.spyOn(apiClient, "get");

    await expect(backendStatus.ensureChecked()).resolves.toBe(true);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("ensureChecked does not probe while the backend is known to be offline", async () => {
    backendStatus.markOffline();
    const getSpy = vi.spyOn(apiClient, "get");

    await expect(backendStatus.ensureChecked()).resolves.toBe(false);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("ensureChecked probes while the status is still unknown", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce({ data: { message: "Gateway Healthy" } });

    await expect(backendStatus.ensureChecked()).resolves.toBe(true);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it("distinguishes connectivity failures from server-side errors", () => {
    expect(isConnectivityError(networkError())).toBe(true);
    expect(isConnectivityError(serverError())).toBe(false);
    expect(isConnectivityError(new Error("boom"))).toBe(false);
    expect(isConnectivityError(null)).toBe(false);
  });
});

describe("backendStatus.watch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    backendStatus.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("probes on start, flips offline on network failures and recovers on the next poll", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: { message: "Gateway Healthy" } });

    const stopWatching = backendStatus.watch();
    await vi.advanceTimersByTimeAsync(0);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(backendStatus.isOnline()).toBe(true);

    // A failed API request is reported by the API client interceptor.
    window.dispatchEvent(new CustomEvent("lcarena:server-connection-error"));
    expect(backendStatus.isOffline()).toBe(true);

    // The offline poll keeps checking until the backend answers again.
    getSpy.mockRejectedValueOnce(networkError());
    await vi.advanceTimersByTimeAsync(15000);
    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(backendStatus.isOffline()).toBe(true);

    await vi.advanceTimersByTimeAsync(15000);
    expect(getSpy).toHaveBeenCalledTimes(3);
    expect(backendStatus.isOnline()).toBe(true);

    // Cleanup stops the offline poll: no further probes.
    window.dispatchEvent(new CustomEvent("lcarena:server-connection-error"));
    stopWatching();
    await vi.advanceTimersByTimeAsync(60000);
    expect(getSpy).toHaveBeenCalledTimes(3);
  });

  it("stops polling once the backend is online", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: { message: "Gateway Healthy" } });

    const stopWatching = backendStatus.watch();
    await vi.advanceTimersByTimeAsync(0);
    expect(getSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(45000);
    expect(getSpy).toHaveBeenCalledTimes(1);

    stopWatching();
  });

  it("re-probes when the tab becomes visible while offline", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ data: { message: "Gateway Healthy" } });

    const stopWatching = backendStatus.watch();
    await vi.advanceTimersByTimeAsync(0);
    expect(backendStatus.isOffline()).toBe(true);

    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(backendStatus.isOnline()).toBe(true);

    stopWatching();
  });

  it("re-probes when the browser reports it is back online", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ data: { message: "Gateway Healthy" } });

    const stopWatching = backendStatus.watch();
    await vi.advanceTimersByTimeAsync(0);
    expect(backendStatus.isOffline()).toBe(true);

    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(backendStatus.isOnline()).toBe(true);

    stopWatching();
  });
});
