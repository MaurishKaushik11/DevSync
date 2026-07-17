import { FormEvent, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getGithubOAuthUrl } from "../services/apiClient";
import { useAuthStore } from "../store/useAuthStore";

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-workspace px-4 py-10 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 10%, rgba(46,230,166,0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(46,230,166,0.06), transparent 50%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-signal/15 ring-1 ring-signal/30">
              <span className="font-display text-sm font-bold text-signal">
                DS
              </span>
            </div>
            <span className="font-display text-xl font-bold text-mist-100 tracking-tight">
              DevSync
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-mist-100">
            {title}
          </h1>
          <p className="mt-2 text-sm text-mist-500">{subtitle}</p>
        </div>
        <div className="rounded-lg border border-ink-500 bg-ink-850/90 p-6 shadow-panel backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError("Email and password are required.");
      return;
    }

    try {
      await login({ email: email.trim(), password });
      navigate("/rooms", { replace: true });
    } catch {
      // error stored in auth store
    }
  };

  const displayError = localError || error;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Jump into live interview and pair-programming rooms."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="block text-[10px] font-mono uppercase tracking-wider text-mist-500 mb-1.5">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ds-input"
            required
            aria-invalid={Boolean(displayError)}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-[10px] font-mono uppercase tracking-wider text-mist-500 mb-1.5">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ds-input"
            required
          />
        </div>

        {displayError && (
          <p role="alert" className="text-sm text-red-400">
            {displayError}
          </p>
        )}

        <button type="submit" className="ds-btn-primary" disabled={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-mist-500">
          or
        </span>
        <div className="h-px flex-1 bg-ink-500" />
      </div>

      <a
        href={getGithubOAuthUrl()}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-ink-400 bg-ink-700 px-3 py-2 text-sm font-medium text-mist-100 transition hover:bg-ink-600"
      >
        Continue with GitHub
      </a>

      <p className="mt-5 text-center text-sm text-mist-500">
        New here?{" "}
        <Link to="/signup" className="text-signal hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();
    setLocalError(null);

    if (!displayName.trim() || !email.trim() || password.length < 8) {
      setLocalError(
        "Display name, email, and a password of at least 8 characters are required."
      );
      return;
    }

    try {
      await signup({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      navigate("/rooms", { replace: true });
    } catch {
      // error in store
    }
  };

  const displayError = localError || error;

  return (
    <AuthShell
      title="Create account"
      subtitle="Host durable rooms for interviews and pair programming."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="signup-name" className="block text-[10px] font-mono uppercase tracking-wider text-mist-500 mb-1.5">
            Display name
          </label>
          <input
            id="signup-name"
            name="displayName"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="ds-input"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="block text-[10px] font-mono uppercase tracking-wider text-mist-500 mb-1.5">
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ds-input"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-[10px] font-mono uppercase tracking-wider text-mist-500 mb-1.5">
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ds-input"
            minLength={8}
            required
          />
        </div>

        {displayError && (
          <p role="alert" className="text-sm text-red-400">
            {displayError}
          </p>
        )}

        <button type="submit" className="ds-btn-primary" disabled={isLoading}>
          {isLoading ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-mist-500">
          or
        </span>
        <div className="h-px flex-1 bg-ink-500" />
      </div>

      <a
        href={getGithubOAuthUrl()}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-ink-400 bg-ink-700 px-3 py-2 text-sm font-medium text-mist-100 transition hover:bg-ink-600"
      >
        Continue with GitHub
      </a>

      <p className="mt-5 text-center text-sm text-mist-500">
        Already have an account?{" "}
        <Link to="/login" className="text-signal hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
