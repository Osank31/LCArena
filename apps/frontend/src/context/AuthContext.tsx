import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  LoginCredentials,
  LoginOtpCredentials,
  RegisterCredentials,
  UserProfile,
} from "../types/auth.types";
import {
  getStoredToken,
  setStoredToken,
} from "../services/apiClient";
import { authService } from "../services/authService";

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithOtp: (credentials: LoginOtpCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch {
      setUser(null);
      setStoredToken(null);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const profile = await authService.getProfile();
        if (isMounted) setUser(profile);
      } catch {
        // Try refresh if profile fetch failed
        try {
          const refreshed = await authService.refresh();
          if (isMounted && refreshed?.user) {
            setUser(refreshed.user);
          }
        } catch {
          if (isMounted) {
            setUser(null);
            setStoredToken(null);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || "Login failed.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (credentials: LoginOtpCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.loginWithOtp(credentials);
      setUser(data.user);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || "OTP Login failed.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.register(credentials);
      setUser(data.user);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || "Registration failed.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string) => {
    setError(null);
    try {
      await authService.sendOtp(email);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || "Failed to send OTP.";
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        loginWithOtp,
        register,
        sendOtp,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
