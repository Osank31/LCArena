import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "./components/common/Footer";
import { Navbar } from "./components/common/Navbar";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ServerStatusModal } from "./components/common/ServerStatusModal";
import { backendStatus } from "./services/backendStatus";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProblemDetailPage } from "./pages/ProblemDetailPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";

// Inner layout component to conditionally omit footer on full-screen IDE workspace
export const AppLayout: React.FC = () => {
  const location = useLocation();

  // Detect the backend on startup, recover automatically when it comes back
  // online, and flip to offline as soon as a request fails at the network level.
  // Automated tests never probe the network; they set the status explicitly.
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return backendStatus.watch();
  }, []);

  const isWorkspace =
    location.pathname.startsWith("/problems/") &&
    location.pathname !== "/problems";

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <ServerStatusModal />
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* The problems catalog is the landing page for the platform. */}
          <Route path="/" element={<Navigate to="/problems" replace />} />
          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/submissions" element={<SubmissionsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isWorkspace && <Footer />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;