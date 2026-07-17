import { Link } from "react-router-dom";

/** Legacy ?session= links are no longer supported for joining. */
export function LegacySessionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-workspace px-4">
      <div className="max-w-md text-center rounded-lg border border-ink-500 bg-ink-850/90 p-6 shadow-panel">
        <h1 className="font-display text-xl font-semibold text-mist-100 mb-2">
          Session link outdated
        </h1>
        <p className="text-sm text-mist-500 mb-5">
          Direct <span className="font-mono text-mist-400">?session=</span>{" "}
          links are no longer supported. Ask the host for a new invite at{" "}
          <span className="font-mono text-mist-400">/join/&lt;shareId&gt;</span>
          .
        </p>
        <Link
          to="/login"
          className="inline-flex ds-btn-primary max-w-[220px] mx-auto justify-center"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
