export type UserRole = "Regular" | "Admin" | "Premium";

export interface UserProfile {
  userId: string;
  id?: string;
  email: string;
  name: string;
  userRole: UserRole;
  userType?: UserRole;
  profilePicUrl?: string;
  createdAt?: string;
}

export interface AuthResponseData {
  user: UserProfile;
  accessToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: any[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginOtpCredentials {
  email: string;
  otp: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  otp: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
