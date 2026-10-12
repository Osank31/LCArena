import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { History, LayoutGrid, LogOut, Menu, User, X } from "lucide-react";
import { useEntrance } from "../../animations";
import { useAuth } from "../../context/AuthContext";
import { RoleBadge } from "./Badge";
import { Button } from "./Button";

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Menus drop in with a short fade + translate; the same tween is replayed
  // whenever the corresponding menu is (re)opened.
  const dropdownRef = useEntrance({ deps: [userDropdownOpen], y: -4 });
  const mobileDrawerRef = useEntrance({ deps: [mobileMenuOpen], y: -6 });

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    // "/" now redirects to the problems catalog.
    navigate("/");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
      isActive
        ? "text-ink border-b-2 border-ink"
        : "text-ink-3 border-b-2 border-transparent hover:text-ink hover:border-rule-2"
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rule bg-paper/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link
            to="/problems"
            className="flex items-baseline gap-2 text-ink hover:opacity-80 transition-opacity"
          >
            <span className="font-serif text-xl font-bold tracking-tight">
              LCArena
            </span>
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-widest text-ink-3">
              Online Judge
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/problems" className={navLinkClass}>
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Problems</span>
            </NavLink>
            <NavLink to="/submissions" className={navLinkClass}>
              <History className="w-3.5 h-3.5" />
              <span>Submissions</span>
            </NavLink>
          </nav>
        </div>

        {/* Right side Auth Controls */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("lcarena:open-demo-modal"))}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-sm border border-rule-2 bg-paper-2/60 hover:border-ink-3 text-ink-2 hover:text-ink transition-colors cursor-pointer"
            title="Frontend Demo Mode — View Developer Apology Note"
            aria-label="Open developer apology note"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ink-3" />
            <span>Demo Mode 🥹</span>
          </button>
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-sm border border-rule hover:border-ink-3 bg-paper-2/60 transition-colors cursor-pointer"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-7 h-7 rounded-full border border-ink flex items-center justify-center text-ink font-serif font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-medium text-ink leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-ink-3 leading-tight">
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
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-56 rounded-sm bg-paper-3 border border-rule-2 shadow-[4px_4px_0_0_rgba(33,30,25,0.12)] py-1.5 z-30 text-xs"
                  >
                    <div className="px-3 py-2 border-b border-rule mb-1">
                      <p className="font-serif font-bold text-ink">{user.name}</p>
                      <p className="text-[11px] text-ink-3 truncate">
                        {user.email}
                      </p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-ink-2 hover:bg-paper-2 hover:text-ink transition-colors"
                    >
                      <User className="w-4 h-4 text-ink-3" />
                      <span>Profile &amp; Stats</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-ink hover:bg-paper-2 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-ink-3" />
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
            className="p-1.5 rounded-sm text-ink-2 hover:text-ink hover:bg-paper-2 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          ref={mobileDrawerRef}
          className="md:hidden border-b border-rule bg-paper-2 px-4 pt-2 pb-4 space-y-2"
        >
          <NavLink
            to="/problems"
            onClick={() => setMobileMenuOpen(false)}
            className={navLinkClass}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Problems</span>
          </NavLink>
          <NavLink
            to="/submissions"
            onClick={() => setMobileMenuOpen(false)}
            className={navLinkClass}
          >
            <History className="w-3.5 h-3.5" />
            <span>Submissions</span>
          </NavLink>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              window.dispatchEvent(new CustomEvent("lcarena:open-demo-modal"));
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-ink-2 hover:text-ink border border-rule-2 rounded-sm bg-paper-2/60 text-left cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ink-3" />
            <span>Demo Mode 🥹 (Developer Note)</span>
          </button>

          <div className="pt-2 border-t border-rule">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-xs text-ink font-medium">
                    {user.name}
                  </span>
                  <RoleBadge role={user.userRole} />
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-ink-2 hover:text-ink"
                >
                  <User className="w-4 h-4" />
                  <span>Profile &amp; Stats</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:text-ink-2 text-left"
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
