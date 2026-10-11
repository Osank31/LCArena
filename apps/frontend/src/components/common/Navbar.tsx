import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Code2,
  Cpu,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { RoleBadge } from "./Badge";
import { Button } from "./Button";

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate("/");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "text-blue-400 bg-blue-500/10"
        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg text-slate-100 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <span className="tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              LCArena
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/problems" className={navLinkClass}>
              <LayoutGrid className="w-4 h-4" />
              <span>Problems</span>
            </NavLink>
            <NavLink to="/submissions" className={navLinkClass}>
              <History className="w-4 h-4" />
              <span>Submissions</span>
            </NavLink>
          </nav>
        </div>

        {/* Right side Auth Controls */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-colors cursor-pointer"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-medium text-slate-200 leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {user.email}
                  </div>
                </div>
                <RoleBadge role={user.userRole} />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1.5 z-30 text-xs">
                    <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                      <p className="font-semibold text-slate-200">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Profile & Stats</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-slate-800 hover:text-rose-300 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-2">
          <NavLink
            to="/problems"
            onClick={() => setMobileMenuOpen(false)}
            className={navLinkClass}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Problems</span>
          </NavLink>
          <NavLink
            to="/submissions"
            onClick={() => setMobileMenuOpen(false)}
            className={navLinkClass}
          >
            <History className="w-4 h-4" />
            <span>Submissions</span>
          </NavLink>

          <div className="pt-2 border-t border-slate-800/80">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-xs text-slate-300 font-medium">{user.name}</span>
                  <RoleBadge role={user.userRole} />
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white"
                >
                  <User className="w-4 h-4" />
                  <span>Profile & Stats</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
