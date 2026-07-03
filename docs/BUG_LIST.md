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
| **Root Cause** | Typo: should be `group.date.toISOString()` or the function should include `dateKey`. |
| **Affected Files** | `MessageList.jsx:150` |
| **Priority** | Medium |
| **Status** | Pending |
| **Fix** | Change `group.dateKey` → `group.date.toISOString()`. |

---

### M2 — Deprecated `onKeyPress` event

| Field | Value |
|-------|-------|
| **Description** | `MessageInput.jsx:77` uses `onKeyPress` which is deprecated in React 19. Should use `onKeyDown`. |
| **Root Cause** | Legacy React event usage. |
| **Affected Files** | `MessageInput.jsx:77` |
| **Priority** | Medium |
| **Status** | Pending |
| **Fix** | Replace `onKeyPress` with `onKeyDown` and adjust handler accordingly. |

---

### M3 — `index.html` title still "vite-project"

| Field | Value |
|-------|-------|
| **Description** | `client/index.html:7` has `<title>vite-project</title>`. |
| **Root Cause** | Never customized after Vite scaffolding. |
| **Affected Files** | `client/index.html:7` |
| **Priority** | Medium |
| **Status** | Pending |
| **Fix** | Change to `<title>Quick Chat</title>`. |

---

### M4 — Hardcoded localhost URLs in email templates

| Field | Value |
|-------|-------|
| **Description** | `auth.template.js:5,18` hardcodes `http://localhost:5000/...` instead of using `config.server.clientUrls[0]` (which is commented out). |
| **Root Cause** | Developer commented out config-based URLs and hardcoded localhost for testing. |
| **Affected Files** | `auth.template.js:5,18` |
| **Priority** | Medium |
| **Status** | Pending |
| **Fix** | Restore config-based URLs, make localhost fallback for development. |

---

### M5 — `rejectUnauthorized: false` in sendmail

| Field | Value |
|-------|-------|
| **Description** | `sendmail.js:14` has `tls: { rejectUnauthorized: false }`. Disables TLS certificate validation, allowing MITM attacks on email in production. |
| **Root Cause** | Added for development convenience, never made conditional. |
| **Affected Files** | `sendmail.js:14` |
| **Priority** | Medium |
| **Status** | Pending |
| **Fix** | Make conditional: `rejectUnauthorized: config.isProduction ? true : false`. |

---

## 🔵 Low

### L1 — Filename typos

| Field | Value |
|-------|-------|
| **Description** | `auth.middlware.js` (missing "e" in middlewar**e**) and `asyncHanlder.js` (missing "d" in Han**d**ler). |
| **Root Cause** | Typo during file creation. |
| **Affected Files** | `auth.middlware.js`, `asyncHanlder.js` + all files importing them |
| **Priority** | Low |
| **Status** | Pending |
| **Fix** | Rename files and update all imports. |

---

### L2 — Dead code: `socket.service.js`

| Field | Value |
|-------|-------|
| **Description** | Entire `services/socket.service.js` (157 lines) is never imported anywhere. Contains `SocketService` class with helper methods. |
| **Root Cause** | Probably intended to be used by `socket.config.js` but never integrated. |
| **Affected Files** | `services/socket.service.js` |
| **Priority** | Low |
| **Status** | Pending |
| **Fix** | Delete the file or integrate into `socket.config.js`. |

---

### L3 — Dead model methods

| Field | Value |
|-------|-------|
| **Description** | `User.findByIdentifier()`, `Conversation.existsBetweenUsers()`, `Message.isReadBy()`, `Message.markAsDelivered()`, `Message.searchMessages()` (controller uses `Message.find()` directly). `ApiResponse.noContent()` and several `AppError` static factories never called. |
| **Root Cause** | Accumulated during development, never pruned. |
| **Affected Files** | `User.js`, `Conversation.model.js`, `Message.model.js`, `ApiResponse.js`, `AppError.js` |
| **Priority** | Low |
| **Status** | Pending |
| **Fix** | Remove unused exports. |

---

### L4 — Real credentials in tracked `.env`

| Field | Value |
|-------|-------|
| **Description** | `server/.env` contains real Gmail address, app password, and JWT secrets. If the repo is public (or becomes public), these are exposed. |
| **Root Cause** | `.env` listed in `.gitignore` but was committed before gitignore existed (or was force-added). |
| **Affected Files** | `server/.env` |
| **Priority** | Low (Security) |
| **Status** | Pending |
| **Fix** | Rotate all credentials immediately. Remove `.env` from git history. |

---

### L5 — `api.patch('/auth/update-profile')` dead endpoint

| Field | Value |
|-------|-------|
| **Description** | Will be removed as part of H1 fix. Listed separately for tracking. |
| **Root Cause** | Same as H1. |
| **Affected Files** | `AuthContext.jsx:143` |
| **Priority** | Low |
| **Status** | Pending |
| **Fix** | Resolved by H1. |

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 5 | All Pending |
| 🟠 High | 4 | All Pending |
| 🟡 Medium | 5 | All Pending |
| 🔵 Low | 5 | All Pending |
| **Total** | **19** | **0 / 19 Done** |
