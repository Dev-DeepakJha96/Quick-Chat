# Changelog — Quick-Chat Recovery

> All notable changes during the recovery process are documented here.

---

## [Pre-Recovery] — 2026-07-03

### Added
- Created `/docs` directory as single source of truth
- `MASTER_PLAN.md` — Full recovery roadmap with phases, dependencies, acceptance criteria
- `BUG_LIST.md` — Complete bug inventory (19 issues: C1–C5, H1–H4, M1–M5, L1–L5)
- `ARCHITECTURE.md` — Full system architecture documentation
- `PROGRESS.md` — Trackable checklist for all phases
- `CHANGELOG.md` — This file

---

## [Phase 1, C3] — 2026-07-03

### Fixed: C3 — Socket token cookie lookup mismatch

**Problem:** `SocketContext.jsx` tried to read `document.cookie` looking for a `token` cookie. The backend sets `accessToken` as httpOnly — JavaScript cannot read httpOnly cookies. Token was always null.

**Change:** Store `accessToken` from login/register responses in localStorage (AuthContext). SocketContext reads from localStorage instead of document.cookie.

**Files Modified:**
- `client/src/context/AuthContext.jsx` — store `accessToken` in localStorage on login/register, clear on logout
- `client/src/context/SocketContext.jsx` — read token from localStorage instead of document.cookie

---

## [Phase 1, C2] — 2026-07-03

### Fixed: C2 — No `/users/search` backend route

**Problem:** Frontend calls `GET /users/search?q=...` but no route existed. Only `/auth`, `/conversations`, and `/messages` were mounted.

**Change:** Created user search endpoint with regex-based search on username/email, excluding current user.

**Files Created:**
- `server/src/controllers/user.controller.js` — `searchUsers` handler
- `server/src/routes/user.routes.js` — `GET /search` (protected)

**Files Modified:**
- `server/src/routes/index.js` — mounted `/users` routes

---

## [Phase 1, C1] — 2026-07-03

### Fixed: C1 — `_id` deleted by toJSON/toObject transforms

**Problem:** Both `Conversation.model.js` and `Message.model.js` had toJSON/toObject transforms that deleted `ret._id` and replaced with `ret.id`. Frontend reads `._id` everywhere (34+ references), so all IDs were `undefined`.

**Change:** Removed `delete ret._id;` from all 4 transform functions (2 models × toJSON + toObject). `ret.id = ret._id` is preserved for backward compatibility.

**Files Modified:**
- `server/src/models/Conversation.model.js` — lines 29, 37
- `server/src/models/Message.model.js` — lines 93, 101
