# DevSync Repository Info

- **Repo name**: DevSync
- **Monorepo**: Yes — frontend (Vite + React + TS) and backend (Spring Boot)
- **Primary deploy target**: Vercel (SPA)
- **Build artifacts**: frontend/dist
- **SPA routing**: Rewrites all paths to /index.html

## Frontend
- **Path**: frontend/
- **Stack**: Vite 6, React 18, TypeScript, Tailwind
- **Scripts**:
  - dev: vite
  - build: tsc -b && vite build
  - preview: vite preview
- **Index**: frontend/index.html
- **Entry**: src/main.tsx
- **Output**: dist/
- **Key modules**:
  - Editor: Monaco
  - State: Zustand
  - Terminal: xterm
  - Collab: custom hooks & OT types
- **Branding**: DevSync (theme key: devSyncTheme)
- **Vercel config**:
  - Root vercel.json points to frontend/package.json with @vercel/static-build
  - Rewrites: all routes -> /index.html (also a frontend/vercel.json exists for using frontend as root)

## Backend
- **Path**: backend/
- **Stack**: Java, Spring Boot
- **Build**: Maven wrapper (mvnw / mvnw.cmd)
- **Artifact**: target/
- **Purpose**: code execution service endpoints

## Known conventions
- **OT WebView files**: index.html, style.css, script.js
- **Terminal command**: `devsync` prints ASCII banner
- **Resizable panels**: explorer, terminal, webview via custom hook

## Common tasks
- **Local build (frontend)**: in frontend/, run `npm run build`
- **Dev (frontend)**: in frontend/, run `npm run dev`
- **Deploy**: push to main → Vercel builds automatically, or Redeploy from latest commit

## Notes
- Both root and frontend have vercel.json; either repo root or frontend can be project root on Vercel.
- SPA 404s fixed by rewrites → index.html.