import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Mail,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { Alert } from "../components/common/Alert";
import { Badge, RoleBadge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Modal } from "../components/common/Modal";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { problemService } from "../services/problemService";
import { submissionService } from "../services/submissionService";
import { ParsedProblem } from "../types/problem.types";
import { ISubmission } from "../types/submission.types";
import { parseVerdict } from "../utils/verdictHelper";

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<ISubmission[]>([]);
  const [problems, setProblems] = useState<ParsedProblem[]>([]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const effectiveUserId = user.userId || (user as any).id;
    const userSubs = submissionService.getLocalSubmissions(effectiveUserId);
    setSubmissions(userSubs);

    problemService
      .getAllProblems()
      .then((data) => setProblems(data))
      .catch(() => {});
  }, [user]);

  // Map of problemId to problem
  const problemMap = useMemo(() => {
    const map = new Map<string, ParsedProblem>();
    problems.forEach((p) => map.set(p.id, p));
    return map;
  }, [problems]);

  // Statistics calculation based on real submission records
  const stats = useMemo(() => {
    const solvedSet = new Set<string>();
    let easySolved = 0;
    let medSolved = 0;
    let hardSolved = 0;

    for (const sub of submissions) {
      if (
        sub.status &&
        sub.status.status === "SUCCESS" &&
        sub.status.passed === sub.status.total &&
        sub.status.total > 0
      ) {
        if (!solvedSet.has(sub.problemId)) {
          solvedSet.add(sub.problemId);
          const prob = problemMap.get(sub.problemId);
          if (prob?.difficulty === "Easy") easySolved++;
          else if (prob?.difficulty === "Medium") medSolved++;
          else if (prob?.difficulty === "Hard") hardSolved++;
        }
      }
    }

    const totalSubmissions = submissions.length;
    const acceptedCount = submissions.filter(
      (s) =>
        s.status &&
        s.status.status === "SUCCESS" &&
        s.status.passed === s.status.total
    ).length;

    const acceptanceRate =
      totalSubmissions > 0
        ? Math.round((acceptedCount / totalSubmissions) * 100)
        : 0;

    return {
      solvedCount: solvedSet.size,
      easySolved,
      medSolved,
      hardSolved,
      totalSubmissions,
      acceptanceRate,
    };
  }, [submissions, problemMap]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordNotice({
        type: "error",
        message: "Please fill out both password fields.",
      });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice({
        type: "error",
        message: "New password must be at least 6 characters.",
      });
      return;
    }

    setIsChangingPassword(true);
    setPasswordNotice(null);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setPasswordNotice({
        type: "success",
        message: "Password changed successfully!",
      });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordNotice({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to update password.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await authService.deleteAccount(deletePassword || undefined);
      setShowDeleteModal(false);
      await logout();
      navigate("/");
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.message || err.message || "Failed to delete account."
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 border-2 border-blue-400/40 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{user.name}</h1>
              <RoleBadge role={user.userRole} />
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>
                Member since{" "}
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "2026"}
              </span>
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="flex items-center gap-6 bg-slate-950/60 border border-slate-800 px-6 py-3 rounded-xl">
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {stats.solvedCount}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Solved
            </div>
          </div>
          <div className="text-slate-800">|</div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400 font-mono">
              {stats.totalSubmissions}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Submissions
            </div>
          </div>
          <div className="text-slate-800">|</div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-400 font-mono">
              {stats.acceptanceRate}%
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Acceptance
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Solved Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Difficulty Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Difficulty Breakdown
          </h2>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-medium">Easy</span>
                <span className="text-slate-300 font-mono font-semibold">
                  {stats.easySolved}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.easySolved * 10)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400 font-medium">Medium</span>
                <span className="text-slate-300 font-mono font-semibold">
                  {stats.medSolved}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.medSolved * 8)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 font-medium">Hard</span>
                <span className="text-slate-300 font-mono font-semibold">
                  {stats.hardSolved}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.hardSolved * 15)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (2 cols): Recent Submissions */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Recent Submissions
            </h2>
            <Link
              to="/submissions"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View Full History →
            </Link>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No recent submissions recorded on this device yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {submissions.slice(0, 5).map((sub) => {
                const verdict = parseVerdict(sub.status);
                const prob = problemMap.get(sub.problemId);

                return (
                  <div
                    key={sub._id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${verdict.badgeClass}`}
                      >
                        {verdict.verdict}
                      </span>
                      <Link
                        to={`/problems/${sub.problemId}`}
                        className="font-medium text-slate-200 hover:text-blue-400 truncate max-w-xs"
                      >
                        {prob?.title || `Problem ${sub.problemId.slice(-4)}`}
                      </Link>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400">
                      <span className="uppercase font-mono text-[11px]">
                        {sub.language}
                      </span>
                      {typeof verdict.timeMs === "number" && (
                        <span className="font-mono text-slate-500 hidden sm:inline">
                          {verdict.timeMs}ms
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Account Settings / Security */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span>Security & Account Settings</span>
        </h2>

        {passwordNotice && (
          <Alert
            type={passwordNotice.type}
            message={passwordNotice.message}
            onDismiss={() => setPasswordNotice(null)}
          />
        )}

        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          <Input
            label="Current Password"
            type="password"
            required
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="New Password"
            type="password"
            required
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<KeyRound className="w-4 h-4" />}
          />

          <Button
            type="submit"
            variant="secondary"
            size="sm"
            isLoading={isChangingPassword}
          >
            Update Password
          </Button>
        </form>

        <hr className="border-slate-800" />

        {/* Delete Account */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h3 className="text-sm font-semibold text-rose-400">Danger Zone</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Permanently delete your LCArena profile and revoke all active sessions.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Account Deletion"
        description="This action is irreversible. All your sessions and identity data will be removed from LCArena."
      >
        <div className="space-y-4 mt-2">
          {deleteError && <Alert type="error" message={deleteError} />}

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Enter password to confirm"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeletingAccount}
              onClick={handleDeleteAccount}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
