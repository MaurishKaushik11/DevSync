import { Navigate, Outlet, useLocation } from "react-router-dom";
import { selectIsAuthenticated, useAuthStore } from "../store/useAuthStore";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-workspace text-mist-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-workspace text-mist-500 text-sm">
        Loading…
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/rooms" replace />;
  }

  return <Outlet />;
}

export function HomeRedirect() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-workspace text-mist-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <Navigate to={isAuthenticated ? "/rooms" : "/login"} replace />
  );
}
