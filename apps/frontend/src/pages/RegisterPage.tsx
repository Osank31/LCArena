import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Lock, Mail, User } from "lucide-react";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { useEntrance } from "../animations";
import { useAuth } from "../context/AuthContext";

export const RegisterPage: React.FC = () => {
  const { register, sendOtp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Restrained card entrance, matching the sign-in page.
  const cardRef = useEntrance({ scale: 0.985, y: 8, duration: 0.36 });

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address to receive your OTP.");
      return;
    }

    setIsSendingOtp(true);
    setError(null);
    try {
      await sendOtp(email.trim());
      setOtpSent(true);
      setSuccessMsg("Verification code dispatched to your email address!");
    } catch (err: any) {
      setError(err.message || "Failed to dispatch verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please provide the 6-digit verification code sent to your email.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        otp: otp.trim(),
      });
      navigate("/problems");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-paper">
      <div
        ref={cardRef}
        className="w-full max-w-md bg-paper-3 border border-rule-2 rounded-sm p-6 sm:p-8 shadow-[6px_6px_0_0_rgba(33,30,25,0.10)] space-y-6"
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-serif font-bold text-ink">Create an Account</h1>
          <p className="text-xs text-ink-3">
            Join LCArena to compete, track your ratings and solve challenges.
          </p>
        </div>

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

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            required
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
          />

          <div className="flex gap-2 items-end">
            <div className="flex-1">
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
            </div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleSendOtp}
              isLoading={isSendingOtp}
              className="shrink-0 mb-0.5"
            >
              {otpSent ? "Resend" : "Send OTP"}
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
                ? "Check your inbox for the 6-digit confirmation code."
                : "Request an OTP code before submitting."
            }
          />

          <Input
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 6 characters"
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
            Complete Registration
          </Button>
        </form>

        <div className="pt-4 border-t border-rule text-center text-xs text-ink-3">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-ink font-medium underline underline-offset-4 hover:text-ink-2"
          >
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
