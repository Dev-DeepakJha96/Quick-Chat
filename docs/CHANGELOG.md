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

## [Phase 2, H3] — 2026-07-03

### Fixed: H3 — Password validation mismatch

**Problem:** User.js model + RegisterPage/LoginPage frontend validation required 6+ chars, but `auth.validator.js` (Zod) required 8+ chars with complexity rules. Users passed frontend validation but got 400 errors.

**Changes:** Changed all 6 → 8 to match backend validator.

**Files Modified:**
- `server/src/models/User.js:29`
- `client/src/pages/RegisterPage.jsx:65`
- `client/src/pages/LoginPage.jsx:35`

---

## [Phase 2, H2] — 2026-07-03

### Fixed: H2 — Missing socket event handlers

**Problem:** Frontend emits `typing:start`, `typing:stop`, `message:read`, `conversation:join`, `conversation:leave` and listens for `typing:indicator`, `message:readReceipt`, `messages:read`, `conversation:joined`, `conversations:joined` — but backend had none of these handlers.

**Changes:**
- `typing:start` handler — tracks typing state per conversation, broadcasts `typing:indicator` to room
- `typing:stop` handler — clears typing state, broadcasts `typing:indicator { isTyping: false }`
- `message:read` handler — calls `message.markAsRead()`, emits `message:readReceipt` + `messages:read`
- `conversation:join` handler — joins socket room, emits `conversation:joined`
- `conversation:leave` handler — leaves socket room
- Connection handler — emits `conversations:joined` with initial conversation IDs after joining rooms

**Files Modified:**
- `server/src/config/socket.config.js`

---

## [Phase 2, H1] — 2026-07-03

### Fixed: H1 — `updateProfile` calls wrong endpoint

**Problem:** `AuthContext.jsx` called `/auth/update-profile`. Backend route is `PATCH /auth/update-me`.

**Files Modified:**
- `client/src/context/AuthContext.jsx:150`

---

## [Phase 1, C5] — 2026-07-03

### Fixed: C5 — `npm start` path wrong

**Problem:** `"start": "node server.js"` but entry point is at `src/server.js`.

**Change:** Updated path to `"start": "node src/server.js"`.

**Files Modified:**
- `server/package.json:7`

---

## [Phase 1, C4] — 2026-07-03

### Fixed: C4 — Pagination response path missing `.data`

**Problem:** `ChatContext.jsx:59` read `response.data.pagination`. Backend wraps pagination inside ApiResponse's `data` envelope. Correct path is `response.data.data.pagination`.

**Change:** One-line fix with `|| {}` fallback.

**Files Modified:**
- `client/src/context/ChatContext.jsx` — line 59

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
