import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const refresh = useAuthStore((s) => s.refresh);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refresh();
      if (cancelled) return;
      if (token) {
        navigate("/rooms", { replace: true });
      } else {
        setError("GitHub sign-in did not complete. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-workspace px-4">
      <div className="text-center max-w-sm">
        <p className="font-display text-lg text-mist-100 mb-2">
          {error ? "Sign-in failed" : "Finishing sign-in…"}
        </p>
        {error ? (
          <>
            <p role="alert" className="text-sm text-red-400 mb-4">
              {error}
            </p>
            <button
              type="button"
              className="ds-btn-primary max-w-[200px] mx-auto"
              onClick={() => navigate("/login", { replace: true })}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p className="text-sm text-mist-500">
            Completing GitHub OAuth and loading your rooms.
          </p>
        )}
      </div>
    </div>
  );
}
