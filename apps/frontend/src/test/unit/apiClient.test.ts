import { beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  apiClient,
  getErrorMessage,
  getStoredRefreshToken,
  getStoredToken,
  setStoredRefreshToken,
  setStoredToken,
} from "../../services/apiClient";

describe("apiClient and token storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("stores and retrieves access tokens", () => {
    expect(getStoredToken()).toBeNull();
    setStoredToken("test_access_token_123");
    expect(getStoredToken()).toBe("test_access_token_123");
    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });

  it("stores and retrieves refresh tokens", () => {
    expect(getStoredRefreshToken()).toBeNull();
    setStoredRefreshToken("test_refresh_token_456");
    expect(getStoredRefreshToken()).toBe("test_refresh_token_456");
    setStoredRefreshToken(null);
    expect(getStoredRefreshToken()).toBeNull();
  });

  describe("getErrorMessage", () => {
    it("extracts message from AxiosError response data", () => {
      const err = new AxiosError("Request failed");
      err.response = {
        data: { message: "Invalid credentials provided" },
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config: {} as any,
      };
      expect(getErrorMessage(err)).toBe("Invalid credentials provided");
    });

    it("falls back to standard Error message", () => {
      const err = new Error("Network timeout");
      expect(getErrorMessage(err)).toBe("Network timeout");
    });

    it("falls back to default string for non-errors", () => {
      expect(getErrorMessage("unknown")).toBe("An unexpected error occurred.");
    });
  });

  describe("request interceptor", () => {
    it("attaches Authorization header when token is stored", async () => {
      setStoredToken("bearer_jwt_token");
      const config: any = { headers: {} };
      // Invoke the request interceptor handler directly
      const requestHandler = (apiClient.interceptors.request as any).handlers[0].fulfilled;
      const modified = requestHandler(config);

      expect(modified.headers.Authorization).toBe("Bearer bearer_jwt_token");
    });

    it("does not attach Authorization header when no token exists", () => {
      setStoredToken(null);
      const config: any = { headers: {} };
      const requestHandler = (apiClient.interceptors.request as any).handlers[0].fulfilled;
      const modified = requestHandler(config);

      expect(modified.headers.Authorization).toBeUndefined();
    });
  });

  describe("response interceptor 401 handling", () => {
    it("passes through successful responses", () => {
      const responseHandler = (apiClient.interceptors.response as any).handlers[0].fulfilled;
      const fakeResponse = { data: { success: true }, status: 200 };
      expect(responseHandler(fakeResponse)).toBe(fakeResponse);
    });

    it("rejects immediately if error has no config or is auth route", async () => {
      const errorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

      const noConfigErr: any = new Error("No config");
      await expect(errorHandler(noConfigErr)).rejects.toThrow("No config");

      const authRouteErr: any = new AxiosError("Unauthorized");
      authRouteErr.config = { url: "/auth/login" };
      authRouteErr.response = { status: 401 };
      await expect(errorHandler(authRouteErr)).rejects.toThrow();
    });

    it("refreshes token on 401 and replays request", async () => {
      const errorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

      setStoredRefreshToken("valid_refresh_token");

      vi.spyOn(axios, "post").mockResolvedValueOnce({
        data: {
          data: {
            accessToken: "new_refreshed_access",
            refreshToken: "new_refreshed_refresh",
          },
        },
      });

      const originalAdapter = apiClient.defaults.adapter;
      apiClient.defaults.adapter = vi.fn().mockResolvedValue({
        data: { replayed: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      const err: any = new AxiosError("401 error");
      err.config = { url: "/api/problems", headers: {} };
      err.response = { status: 401 };

      await errorHandler(err);

      expect(getStoredToken()).toBe("new_refreshed_access");
      expect(getStoredRefreshToken()).toBe("new_refreshed_refresh");

      apiClient.defaults.adapter = originalAdapter;
    });

    it("clears tokens when token refresh fails on 401", async () => {
      const errorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

      setStoredToken("stale_access");
      setStoredRefreshToken("stale_refresh");

      vi.spyOn(axios, "post").mockRejectedValueOnce(new Error("Refresh expired"));

      const err: any = new AxiosError("401 error");
      err.config = { url: "/api/problems", headers: {} };
      err.response = { status: 401 };

      await expect(errorHandler(err)).rejects.toThrow();

      expect(getStoredToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
    });
  });
});
