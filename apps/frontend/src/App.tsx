import React from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "./components/common/Footer";
import { Navbar } from "./components/common/Navbar";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
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
  const isWorkspace =
    location.pathname.startsWith("/problems/") &&
    location.pathname !== "/problems";

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1117] text-slate-100">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
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