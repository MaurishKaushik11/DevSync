import { useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  HomeRedirect,
  ProtectedRoute,
  PublicOnlyRoute,
} from "./components/ProtectedRoute";
import { LoginPage, SignupPage } from "./pages/AuthPages";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { RoomsDashboardPage } from "./pages/RoomsDashboardPage";
import { GuestJoinPage } from "./pages/GuestJoinPage";
import { RoomWorkspacePage } from "./pages/RoomWorkspacePage";
import { LegacySessionPage } from "./pages/LegacySessionPage";
import { useAuthStore } from "./store/useAuthStore";

function LegacySessionGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (params.has("session")) {
    return <LegacySessionPage />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <LegacySessionGate>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/join/:shareId" element={<GuestJoinPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/rooms" element={<RoomsDashboardPage />} />
        </Route>

        {/* Workspace: account members or guests with guest token */}
        <Route path="/rooms/:roomId" element={<RoomWorkspacePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LegacySessionGate>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
