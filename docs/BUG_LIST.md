# Bug List — Quick-Chat

> Unique IDs: **C** = Critical, **H** = High, **M** = Medium, **L** = Low

---

## 🔴 Critical

### C1 — `_id` deleted by toJSON/toObject transforms

| Field | Value |
|-------|-------|
| **Description** | Both `Conversation.model.js` and `Message.model.js` define `toJSON`/`toObject` transforms that copy `_id` → `id` then `delete ret._id`. Frontend reads `._id` everywhere (34+ references in 6 files). All `._id` values are `undefined`. |
| **Root Cause** | The `transform` functions in the Mongoose schema options. |
| **Affected Files** | `Conversation.model.js:28-32`, `Message.model.js:91-95`, plus every frontend file referencing `._id` |
| **Priority** | Critical |
| **Status** | Done — 2026-07-03 |
| **Fix** | Remove `delete ret._id;` from both transforms. Keep `ret.id = ret._id;` for backward compatibility. |

---

### C2 — No `/users/search` backend route

| Field | Value |
|-------|-------|
| **Description** | Frontend `ChatContext.jsx:212` calls `GET /users/search?q=...`. No route exists in `routes/index.js`. Always returns 404. |
| **Root Cause** | Backend route never implemented. |
| **Affected Files** | Backend: missing `user.routes.js`, `user.controller.js`. Frontend: `ChatContext.jsx:212`. |
| **Priority** | Critical |
| **Status** | Done — 2026-07-03 |
| **Fix** | Create `user.routes.js` with `GET /search`, `user.controller.js` with `searchUsers`, mount in `routes/index.js`. |

---

### C3 — Socket token cookie lookup mismatch

| Field | Value |
|-------|-------|
| **Description** | `SocketContext.jsx:37-42` looks for cookie starting with `token=` but backend sets cookies named `accessToken` and `refreshToken` (`auth.controller.js:9-24`). Socket auth always fails. |
| **Root Cause** | Frontend assumes cookie name `token`, backend uses `accessToken`. |
| **Affected Files** | `AuthContext.jsx`, `SocketContext.jsx:37-42` |
| **Priority** | Critical |
| **Status** | Done — 2026-07-03 |
| **Fix** | Store `accessToken` in localStorage on login/register (AuthContext). Read from localStorage instead of httpOnly cookie (SocketContext). |

---

### C4 — Pagination missing `.data` in response path

| Field | Value |
|-------|-------|
| **Description** | `ChatContext.jsx:59` reads `response.data.pagination`. Backend wraps pagination inside `data` envelope: `ApiResponse.success({ messages, pagination })`. Correct path is `response.data.data.pagination`. |
| **Root Cause** | Developer forgot the nested `.data` from `ApiResponse.success()`. |
| **Affected Files** | `ChatContext.jsx:59` |
| **Priority** | Critical |
| **Status** | Done — 2026-07-03 |
| **Fix** | Change `response.data.pagination` → `response.data.data.pagination`. |

---

### C5 — `npm start` points to wrong path

| Field | Value |
|-------|-------|
| **Description** | `server/package.json` has `"main": "server.js"` and `"start": "node server.js"`, but the file is at `src/server.js`. |
| **Root Cause** | Incorrect path in package.json. |
| **Affected Files** | `server/package.json:5,7` |
| **Priority** | Critical |
| **Status** | Done — 2026-07-03 |
| **Fix** | Change to `"start": "node src/server.js"`. |

---

## 🟠 High

### H1 — `updateProfile` calls wrong endpoint

| Field | Value |
|-------|-------|
| **Description** | `AuthContext.jsx:143` calls `/auth/update-profile`. Backend route is `PATCH /auth/update-me`. |
| **Root Cause** | Frontend endpoint path doesn't match backend definition. |
| **Affected Files** | `AuthContext.jsx:143` |
| **Priority** | High |
| **Status** | Done — 2026-07-03 |
| **Fix** | Change `/auth/update-profile` → `/auth/update-me`. |

---

### H2 — Missing socket event handlers on backend

| Field | Value |
|-------|-------|
| **Description** | Frontend emits `typing:start`, `typing:stop`, `message:read`, `conversation:join`, `conversation:leave`. Backend `socket.config.js` only handled `message:send` and `disconnect`. All other events did nothing. |
| **Root Cause** | Socket event handlers incomplete. |
| **Affected Files** | `server/src/config/socket.config.js` |
| **Priority** | High |
| **Status** | Done — 2026-07-03 |
| **Fix** | Added handlers for `typing:start`, `typing:stop`, `message:read`, `conversation:join`, `conversation:leave`. Emit `typing:indicator`, `message:readReceipt`, `messages:read`, `conversation:joined`, `conversations:joined`. |

---

### H3 — Password validation mismatch

| Field | Value |
|-------|-------|
| **Description** | Frontend `RegisterPage.jsx:63` required only 6+ characters. Backend Zod `auth.validator.js:11-16` requires 8+ chars with lowercase, uppercase, number, and special character. |
| **Root Cause** | Inconsistent validation between layers. |
| **Affected Files** | `RegisterPage.jsx:63`, `User.js:29`, `LoginPage.jsx:35` |
| **Priority** | High |
| **Status** | Done — 2026-07-03 |
| **Fix** | Changed User.js model, RegisterPage.jsx, and LoginPage.jsx from 6→8 to match backend Zod validator. |

---

### H4 — No `/forgot-password`, `/reset-password`, `/verify-email` frontend routes

| Field | Value |
|-------|-------|
| **Description** | LoginPage links to `/forgot-password` (line 107). Backend has `POST /auth/forgot-password` and `POST /auth/reset-password`. No frontend routes or pages exist. Email verification also has no frontend page. |
| **Root Cause** | Frontend routes never created. |
| **Affected Files** | `App.jsx` (missing routes), missing page files |
| **Priority** | High |
| **Status** | Done — 2026-07-03 |
| **Fix** | Created ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage and added routes to App.jsx. |

---

## 🟡 Medium

### M1 — `group.dateKey` is undefined

| Field | Value |
|-------|-------|
| **Description** | `MessageList.jsx:150` renders `<div key={group.dateKey}>`. The `groupMessagesByDate()` function returns objects with `{ date, messages }` keys only. `dateKey` is undefined → React key warning. |
| **Root Cause** | Typo: should include `dateKey` in the group object. |
| **Affected Files** | `MessageList.jsx:76` |
| **Priority** | Medium |
| **Status** | Done — 2026-07-03 |
| **Fix** | Added `dateKey` field to the group object in `groupMessagesByDate()`. |

---

### M2 — Deprecated `onKeyPress` event

| Field | Value |
|-------|-------|
| **Description** | `MessageInput.jsx:77` uses `onKeyPress` which is deprecated in React 19. Should use `onKeyDown`. |
| **Root Cause** | Legacy React event usage. |
| **Affected Files** | `MessageInput.jsx:23,77` |
| **Priority** | Medium |
| **Status** | Done — 2026-07-03 |
| **Fix** | Replaced `onKeyPress` with `onKeyDown`, renamed handler `handleKeyPress` → `handleKeyDown`. |

---

### M3 — `index.html` title still "vite-project"

| Field | Value |
|-------|-------|
| **Description** | `client/index.html:7` had `<title>vite-project</title>`. |
| **Root Cause** | Never customized after Vite scaffolding. |
| **Affected Files** | `client/index.html:7` |
| **Priority** | Medium |
| **Status** | Done — 2026-07-03 |
| **Fix** | Changed to `<title>Quick Chat</title>`. |

---

### M4 — Email template links use wrong URL format

| Field | Value |
|-------|-------|
| **Description** | Email templates used query params (`?token=...`) but frontend routes use path params (`/verify-email/:token`, `/reset-password/:token`). |
| **Root Cause** | Link format never updated to match frontend route definition. |
| **Affected Files** | `auth.template.js:4,17` |
| **Priority** | Medium |
| **Status** | Done — 2026-07-03 |
| **Fix** | Changed URL format to `/verify-email/${token}` and `/reset-password/${token}`. Removed dead commented-out code. |

---

### M5 — `rejectUnauthorized: false` in sendmail

| Field | Value |
|-------|-------|
| **Description** | `sendmail.js:14` had `tls: { rejectUnauthorized: false }`. Disabled TLS certificate validation, allowing MITM attacks on email in production. |
| **Root Cause** | Added for development convenience, never made conditional. |
| **Affected Files** | `sendmail.js:14` |
| **Priority** | Medium |
| **Status** | Done — 2026-07-03 |
| **Fix** | Made conditional: `rejectUnauthorized: env.isProduction`. |

---

## 🔵 Low

### L1 — Filename typos

| Field | Value |
|-------|-------|
| **Description** | `auth.middlware.js` (missing "e") and `asyncHanlder.js` (missing "d"). |
| **Root Cause** | Typo during file creation. |
| **Affected Files** | `auth.middlware.js`, `asyncHanlder.js` + all files importing them |
| **Priority** | Low |
| **Status** | Done — 2026-07-03 |
| **Fix** | Renamed to `auth.middleware.js` and `asyncHandler.js`. Updated all 8 import references across 6 files. |

---

### L2 — Dead code: `socket.service.js`

| Field | Value |
|-------|-------|
| **Description** | Entire `services/socket.service.js` (157 lines) was never imported anywhere. |
| **Root Cause** | Probably intended to be used by `socket.config.js` but never integrated. |
| **Affected Files** | `services/socket.service.js` |
| **Priority** | Low |
| **Status** | Done — 2026-07-03 |
| **Fix** | Deleted the file (zero import references existed). |

---

### L3 — Dead model methods

| Field | Value |
|-------|-------|
| **Description** | `User.findByIdentifier()`, `User.getPublicProfile()`, `Conversation.isParticipant()`, `Conversation.getOtherParticipant()`, `Message.isReadBy()`, `Message.markAsDelivered()`, `Message.searchMessages()` (static — controller uses `Message.find()` directly). `ApiResponse.noContent()` and 4 `AppError` static factories. |
| **Root Cause** | Accumulated during development, never pruned. |
| **Affected Files** | `User.js`, `Conversation.model.js`, `Message.model.js`, `ApiResponse.js`, `AppError.js` |
| **Priority** | Low |
| **Status** | Done — 2026-07-03 |
| **Fix** | Removed 11 unused methods across 5 files. |

---

### L4 — Real credentials in `.env`

| Field | Value |
|-------|-------|
| **Description** | `server/.env` contained real Gmail address and app password visible on disk. `.env` was never committed to git (`.gitignore` was in place). |
| **Root Cause** | Real values left in development `.env` file. |
| **Affected Files** | `server/.env` |
| **Priority** | Low (Security) |
| **Status** | Done — 2026-07-03 |
| **Fix** | Replaced with placeholders. User must manually rotate Gmail app password and update `.env` before deployment. |

---

### L5 — `api.patch('/auth/update-profile')` dead endpoint

| Field | Value |
|-------|-------|
| **Description** | Resolved by H1 fix. |
| **Root Cause** | Same as H1. |
| **Affected Files** | `AuthContext.jsx:143` |
| **Priority** | Low |
| **Status** | Done — 2026-07-03 |
| **Fix** | Resolved by H1 (endpoint changed to `/auth/update-me`). |

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 5 | All Done ✅ |
| 🟠 High | 4 | All Done ✅ |
| 🟡 Medium | 5 | All Done ✅ |
| 🔵 Low | 5 | 4 Done, 1 Resolved by H1 ✅ |
| **Total** | **19** | **19 / 19 Done 🎉** |
