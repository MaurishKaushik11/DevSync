# DevSync

**Instant, zero-setup pair programming and technical interviews.**

An engineering manager or interviewer creates a room, shares a link, and a candidate joins in seconds — **no signup required for guests**. Hosts get durable rooms they can reopen; Redis keeps the live OT stream authoritative while PostgreSQL stores accounts, rooms, and file snapshots.

<!-- Add a short demo GIF/screenshot here -->
<!-- ![DevSync workspace](./docs/devsync-demo.gif) -->

[Demo video (legacy UI)](https://youtu.be/FL0qg1Uo-MQ?si=czYlT2vyO6qMIyL1) · Live editor: [dev-sync-eight.vercel.app](https://dev-sync-eight.vercel.app)

---

## Why I built this

Most “collaborative editors” optimize for documents. Interview and pairing workflows need something different: **fast guest time-to-first-keystroke**, a host retention loop (rooms that persist), and a path to **reviewable sessions**. DevSync is being rebuilt around that product story — starting with auth, durable rooms, and role-aware collaboration — while keeping the custom OT engine and live HTML/CSS/JS preview as the core realtime system.

---

## Who it’s for

| Persona | What they need |
|---|---|
| **Host / interviewer** | Account, create rooms, invite via link, reopen work later |
| **Guest / candidate** | Join with display name only — no account gate |
| **Viewer** (future invites) | Read-only presence without mutating code |

---

## What’s in Phase 1 (Auth, Persistence, Identity)

Implemented on branch `feat/phase-1-auth-persistence`:

- **PostgreSQL** as system of record (Flyway `V1__schema.sql`)
- **Redis** remains live authority for OT content/history + presence (not replaced)
- **Auth:** email/password signup & login, JWT access tokens, opaque refresh tokens (HttpOnly cookie, SHA-256 hashed at rest), optional GitHub OAuth
- **Entities:** `AppUser`, `Room`, `RoomFile`, `RoomMember` (`HOST` / `EDITOR` / `VIEWER`), `CollaborationSession`, `RefreshToken`
- **Guest join:** `POST /api/rooms/join/{shareId}` → ephemeral guest JWT scoped to room/session (no `AppUser` row)
- **My Rooms dashboard:** create / rejoin / rename / delete, sorted by last activity
- **Public GitHub import:** shallow clone into a durable room; text files up to 25 MiB, with files over 1 MiB opened read-only outside the OT stream
- **Debounced snapshots:** accepted OT ops schedule ~3s inactivity flush of Redis → `RoomFile`; explicit save + session end also persist
- **RBAC:** HOST/EDITOR write; VIEWER read-only (UI + server/STOMP); HOST-only rename/delete/end
- **Frontend routes:** `/login`, `/signup`, `/auth/callback`, `/rooms`, `/rooms/:roomId`, `/join/:shareId`

### Product decisions worth noting

1. **Guest access without signup** — interview friction killer; host is the only account required to create rooms.
2. **Redis live + Postgres durable** — OT stays low-latency; Postgres survives restarts/refresh.
3. **Filename document IDs in Redis** (`index.html`, `style.css`, `script.js`) — preserves live-preview sync; Postgres file UUIDs are used only for REST save.

---

## Experimental in-browser Node.js previews (disabled)

The WebContainer implementation is retained for future work but is disabled by default while compatibility is revalidated. Production currently uses the stable static HTML/CSS/JS preview.

When explicitly enabled with `VITE_NODE_PREVIEW_ENABLED=true` and the required COOP/COEP deployment headers, imported JavaScript/TypeScript repositories with a `package.json` can run through the WebContainer API:

- React/Vite and Vue/Vite (`npm run dev`)
- Next.js (`npm run dev`)
- Vue CLI (`npm run serve`)
- Node/Express (`npm run dev` or `npm run start`)

Click **Run** in the workspace. DevSync mounts the imported source into a browser-isolated Node.js runtime, installs npm dependencies, streams logs to the terminal, and opens the detected development server in Live Preview. Edited files are written back to the runtime so framework hot reload can update the preview.

This requires a modern browser with cross-origin isolation support. It does not run Python or Java; those require a separate server-side sandbox. Credential files (`.env*`, private keys, and common credential JSON files) are excluded from repository imports and runtime mounts.

---

## Architecture (high level)

```
Browser (React + Monaco + OT client + Node.js WebContainer)
   │  REST (auth, rooms) + SockJS/STOMP (/ws)
   ▼
Spring Boot
   ├── Security (JWT account + guest principals)
   ├── Room / Auth services → PostgreSQL (Flyway)
   └── OT + presence → Redis (content, history, participants)
```

**STOMP contracts preserved:** `/app/join`, `/app/operation`, `/app/get-document-state`, `/app/selection`, `/app/chat` and `/topic/sessions/{sessionId}/…` destinations.

> Note: the message broker is still the Spring in-memory simple broker. Horizontal WebSocket fan-out across multiple app instances is a later hardening phase (Redis pub/sub broker).

---

## Tech stack

**Frontend:** React, TypeScript, Vite, Tailwind, Zustand, Monaco, Xterm.js, React Router, Axios
**Backend:** Spring Boot 3.4 / Java 17, Spring Security, JJWT, Spring Data JPA, Flyway, WebSocket/STOMP
**Data:** PostgreSQL 16, Redis 7
**Realtime:** Custom Operational Transformation (frontend + backend)

---

## Quick start

### Prerequisites

- Node.js 18+
- Java 17+
- Redis (local binary or Docker)
- PostgreSQL 16 **or** the `local` demo profile (H2) below

### Option A — Local demo (no Docker)

Useful when Docker/Postgres aren’t available. Redis is still required for live OT.

```bash
# 1) Start Redis (example if installed to ~/.local/bin)
redis-server --daemonize yes --port 6379

# 2) Backend with local profile (file-backed H2 + Flyway)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3) Frontend
cd ../frontend
cp .env.example .env   # set VITE_BACKEND_URL=http://localhost:8080
npm install
npm run dev
```

Open `http://localhost:5173` → sign up → create a room → share `/join/{shareId}` in another browser/profile.

> Production should use PostgreSQL (`docker compose up -d` + env datasource). The `local` profile is for development demos only.

### Option B — Docker Postgres + Redis

```bash
cp .env.example .env
# Required: POSTGRES_PASSWORD, JWT_SECRET (>= 32 chars)
docker compose up -d

cd backend && ./mvnw spring-boot:run
cd ../frontend && npm install && npm run dev
```

---

## API surface (Phase 1)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/signup`, `/login`, `/refresh`, `/logout` | public |
| GET | `/api/auth/me` | account JWT |
| GET/POST | `/api/rooms` | account |
| GET/PATCH/DELETE | `/api/rooms/{id}` | member / HOST |
| POST | `/api/rooms/join/{shareId}` | public → guest JWT |
| POST | `/api/rooms/import` | account; public GitHub URL only |
| GET | `/api/rooms/{id}/files/{fileId}/content` | room member / scoped guest |
| POST | `/api/rooms/{id}/files/{fileId}/save` | HOST/EDITOR |
| POST | `/api/rooms/{id}/end` | HOST |
| GET | `/oauth2/authorization/github` | optional OAuth start |

Refresh token: **HttpOnly / Secure(configurable) / SameSite** cookie. Access token returned in JSON and kept **in memory** on the client (not `localStorage`). Guest token may use `sessionStorage` for same-tab refresh only.

---

## Tests

```bash
# Backend (H2 + mocked Redis; no external services required)
cd backend && ./mvnw test

# Frontend
cd frontend && npm test -- --runInBand
```

Phase 1 coverage includes auth/refresh rotation, room RBAC, guest join, snapshot debounce behavior (backend), plus auth store / dashboard / hydrate / OT suites (frontend).

Repository import is bounded by `IMPORT_MAX_FILE_BYTES` (25 MiB default),
`IMPORT_MAX_TOTAL_BYTES` (100 MiB), and `IMPORT_MAX_FILES` (2,000). Generated
dependency/build directories, symlinks, binary files, and unsafe paths are skipped.
Files larger than `IMPORT_COLLABORATION_MAX_BYTES` (1 MiB) are lazy-loaded
read-only and never inserted into Redis OT history.

---

## Roadmap

| Phase | Status | Focus |
|-------|--------|--------|
| **1** | **In progress (this branch)** | Auth, Postgres persistence, guest join, My Rooms, RBAC, debounced snapshots |
| 2 | Planned | Interview Mode (timer, prompt, private interviewer notes) |
| 3 | Planned | Session recording & OT playback |
| 4 | Planned | Multi-language sandboxed execution |
| 5 | Planned | Landing page, onboarding, design system polish |
| 6 | Planned | Host analytics & org accounts |
| 7 | Planned | Production hardening (multi-instance WS, reconnect, metrics, OT concurrency CI) |

---

## License

MIT © [Maurish Kaushik](https://github.com/MaurishKaushik11)
