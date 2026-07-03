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

## [Phase 4, L1–L3] — 2026-07-03

### Fixed: L1 — Filename typos

Renamed `auth.middlware.js` → `auth.middleware.js`, `asyncHanlder.js` → `asyncHandler.js`. Updated all 8 import references across 6 files.

**Files Modified:**
- `server/src/utils/asyncHandler.js` (new, replacing typo)
- `server/src/middlewares/auth.middleware.js` (new, replacing typo)
- Controllers: auth, user, message, conversation — updated imports
- Routes: auth, user, message, conversation — updated imports

---

### Fixed: L2 — Dead socket.service.js removed

157-line `SocketService` class never imported anywhere. Removed.

**Files Modified:**
- `server/src/services/socket.service.js` (deleted)

---

### Fixed: L3 — 11 unused methods removed

Removed dead code from 5 files:
- `User.js`: `getPublicProfile`, `findByIdentifier`
- `Conversation.model.js`: `isParticipant`, `getOtherParticipant`
- `Message.model.js`: `isReadBy`, `markAsDelivered`, `searchMessages` (model static)
- `ApiResponse.js`: `noContent`
- `AppError.js`: `unauthorized`, `forbidden`, `conflict`, `internal` static factories

---

### Fixed: L4 — Exposed credentials sanitized

Replaced real Gmail credentials with placeholders in `.env` (gitignored, on-disk change only). User must manually rotate Gmail app password before deployment.

**Files Modified:**
- `server/.env` — replaced real EMAIL_USER/EMAIL_PASS with placeholders

---

## [Phase 3] — 2026-07-03

### Fixed: M1 — `dateKey` React key missing

**Problem:** `groupMessagesByDate()` returned `{ date, messages }` but JSX used `<div key={group.dateKey}>`.

**Files Modified:**
- `client/src/components/chat/MessageList.jsx:76`

---

### Fixed: M2 — Deprecated `onKeyPress` event

**Problem:** React 19 deprecated `onKeyPress`. Used `onKeyDown` instead.

**Files Modified:**
- `client/src/components/chat/MessageInput.jsx:23,77`

---

### Fixed: M3 — `index.html` title still "vite-project"

**Problem:** Tab title showed "vite-project" from Vite scaffold.

**Files Modified:**
- `client/index.html:7`

---

### Fixed: M4 — Email template links use wrong URL format

**Problem:** Links used `?token=...` (query param) but frontend routes use path params. Removed dead commented-out code.

**Files Modified:**
- `server/src/services/email/templates/auth.template.js:4,17`

---

### Fixed: M5 — TLS validation always disabled

**Problem:** `rejectUnauthorized: false` in all environments including production. Made conditional on `env.isProduction`.

**Files Modified:**
- `server/src/services/email/sendmail.js:14`

---

## [Phase 2, H4] — 2026-07-03

### Fixed: H4 — Missing auth routes/pages

**Problem:** Frontend had no routes or pages for forgot-password, reset-password, or verify-email. Backend endpoints existed but were unreachable from the UI. The LoginPage "Forgot password?" link pointed to a 404.

**Changes:**
- Created `ForgotPasswordPage.jsx` — email form, POST to `/auth/forgot-password`, success state
- Created `ResetPasswordPage.jsx` — extracts `:token` from URL, new password form, POST to `/auth/reset-password`
- Created `VerifyEmailPage.jsx` — extracts `:token` from URL, auto-submits POST to `/auth/verify-email`, loading/success/error states
- Added 3 routes to `App.jsx`

**Files Modified:**
- `client/src/App.jsx` — added imports + 3 `<Route>` entries
- `client/src/pages/ForgotPasswordPage.jsx` (new)
- `client/src/pages/ResetPasswordPage.jsx` (new)
- `client/src/pages/VerifyEmailPage.jsx` (new)

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
