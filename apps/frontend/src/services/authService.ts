import {
  ApiResponse,
  AuthResponseData,
  ChangePasswordPayload,
  LoginCredentials,
  LoginOtpCredentials,
  RegisterCredentials,
  UserProfile,
} from "../types/auth.types";
import {
  apiClient,
  getStoredRefreshToken,
  setStoredRefreshToken,
  setStoredToken,
} from "./apiClient";

export function normalizeUser(rawUser: any): UserProfile {
  if (!rawUser) return rawUser;
  return {
    ...rawUser,
    id: rawUser.id || rawUser.userId || "",
    userId: rawUser.userId || rawUser.id || "",
    userRole: rawUser.userRole || rawUser.userType || "Regular",
    userType: rawUser.userType || rawUser.userRole || "Regular",
  };
}

export const authService = {
  /** Send a 6-digit OTP to the user's email */
  async sendOtp(email: string): Promise<void> {
    await apiClient.post<ApiResponse<null>>("/auth/send-otp", { email });
  },

  /** Register user with email, name, password, and OTP */
  async register(credentials: RegisterCredentials): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/register",
      credentials
    );
    const data = response.data.data;
    if (data?.accessToken) {
      setStoredToken(data.accessToken);
    }
    if (data?.user) {
      data.user = normalizeUser(data.user);
    }
    return data;
  },

  /** Login with email and password */
  async login(credentials: LoginCredentials): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/login",
      credentials
    );
    const data = response.data.data;
    if (data?.accessToken) {
      setStoredToken(data.accessToken);
    }
    if (data?.user) {
      data.user = normalizeUser(data.user);
    }
    return data;
  },

  /** Login passwordlessly with email and OTP */
  async loginWithOtp(credentials: LoginOtpCredentials): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/login-otp",
      credentials
    );
    const data = response.data.data;
    if (data?.accessToken) {
      setStoredToken(data.accessToken);
    }
    if (data?.user) {
      data.user = normalizeUser(data.user);
    }
    return data;
  },

  /** Fetch current user's profile */
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>("/auth/me");
    return normalizeUser(response.data.data);
  },

  /** Refresh access token using cookie or stored refresh token */
  async refresh(): Promise<AuthResponseData> {
    const refreshToken = getStoredRefreshToken();
    const response = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/refresh",
      refreshToken ? { refreshToken } : {}
    );
    const data = response.data.data;
    if (data?.accessToken) {
      setStoredToken(data.accessToken);
    }
    if (data?.user) {
      data.user = normalizeUser(data.user);
    }
    return data;
  },

  /** Log out and revoke active tokens */
  async logout(): Promise<void> {
    try {
      const refreshToken = getStoredRefreshToken();
      await apiClient.post("/auth/logout", refreshToken ? { refreshToken } : {});
    } catch {
      // Best-effort logout cleanup
    } finally {
      setStoredToken(null);
      setStoredRefreshToken(null);
    }
  },

  /** Change user password */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post<ApiResponse<null>>("/auth/change-password", payload);
  },

  /** Delete user account */
  async deleteAccount(password?: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>("/auth/account", {
      data: password ? { password } : {},
    });
    setStoredToken(null);
    setStoredRefreshToken(null);
  },
};
