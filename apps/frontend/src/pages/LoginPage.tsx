import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Lock, Mail, ShieldAlert } from "lucide-react";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Tabs } from "../components/common/Tabs";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { login, loginWithOtp, sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/problems";

  const [activeTab, setActiveTab] = useState<string>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address to receive OTP.");
      return;
    }

    setIsSendingOtp(true);
    setError(null);
    try {
      await sendOtp(email.trim());
      setOtpSent(true);
      setSuccessMsg("Verification code dispatched! Please check your email inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !otp.trim() || otp.trim().length !== 6) {
      setError("Please provide your email and the 6-digit code.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await loginWithOtp({ email: email.trim(), otp: otp.trim() });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-100">Welcome Back</h1>
          <p className="text-xs text-slate-400">
            Sign in to access your coding submissions and progress.
          </p>
        </div>

        {/* Tab switcher */}
        <Tabs
          tabs={[
            {
              id: "password",
              label: "Password",
              icon: <Lock className="w-3.5 h-3.5" />,
            },
            {
              id: "otp",
              label: "Passwordless OTP",
              icon: <KeyRound className="w-3.5 h-3.5" />,
            },
          ]}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setError(null);
            setSuccessMsg(null);
          }}
          variant="pill"
        />

        {error && (
          <Alert
            type="error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {successMsg && (
          <Alert
            type="success"
            message={successMsg}
            onDismiss={() => setSuccessMsg(null)}
          />
        )}

        {activeTab === "password" ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpLogin} className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleSendOtp}
                isLoading={isSendingOtp}
                className="shrink-0 mb-0.5"
              >
                {otpSent ? "Resend" : "Send Code"}
              </Button>
            </div>

            <Input
              label="6-Digit Verification Code"
              type="text"
              maxLength={6}
              required
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              leftIcon={<KeyRound className="w-4 h-4" />}
              helperText={
                otpSent
                  ? "Enter the 6-digit code sent to your email."
                  : "Click 'Send Code' to receive a temporary sign-in code."
              }
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Verify & Sign In
            </Button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          Don't have an account yet?{" "}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
