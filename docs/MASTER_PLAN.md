# Quick-Chat — Master Recovery Plan

## Overview

Full-stack chat application (React + Vite + Tailwind v4 frontend, Express 5 + Mongoose 9 + Socket.IO backend). This plan documents the systematic recovery of all known bugs, architectural inconsistencies, and missing features across the entire codebase.

---

## Phase 1 — Critical (App Cannot Function)

**Goal:** Make the core flow work — register → login → search users → create conversation → send/receive messages.

| Step | Task | Files | Dependency | Acceptance Criteria |
|------|------|-------|------------|---------------------|
| 1.1 | Fix `_id` → `id` transform in models | `Conversation.model.js`, `Message.model.js` | None | Frontend can read `conversation._id` and `message._id` |
| 1.2 | Add `GET /users/search` backend route | New `user.routes.js`, `user.controller.js`, `routes/index.js` | None | Frontend searchUsers returns matching users |
| 1.3 | Fix socket token cookie lookup | `SocketContext.jsx` | None | Socket connects with `accessToken` cookie |
| 1.4 | Fix pagination response path | `ChatContext.jsx` | None | `hasMore`/`nextBefore` read correctly |
| 1.5 | Fix `npm start` path | `server/package.json` | None | `npm start` runs the server |

**Verification:** `npm run dev` on both client and server → register two users → search for user → create conversation → send message → message appears in real-time.

---

## Phase 2 — High (Major Features Broken)

**Goal:** Fix all broken feature paths and align frontend/backend contracts.

| Step | Task | Files | Dependency | Acceptance Criteria |
|------|------|-------|------------|---------------------|
| 2.1 | Fix `updateProfile` endpoint path | `AuthContext.jsx` | None | Profile updates return 200 |
| 2.2 | Add missing socket event handlers | `socket.config.js` | Phase 1.3 | Typing indicators, read receipts, join room work |
| 2.3 | Align password validation | `User.js:29`, `RegisterPage.jsx:65`, `LoginPage.jsx:35` | None | User can register with consistent rules |
| 2.4 | Add missing auth routes + pages | `App.jsx`, new page files | None | `/forgot-password`, `/reset-password`, `/verify-email` render |

---

## Phase 3 — Medium (Feature Degradation)

**Goal:** Eliminate React warnings, UI inconsistencies, and email/security gaps.

| Step | Task | Files | Dependency | Acceptance Criteria |
|------|------|-------|------------|---------------------|
| 3.1 | Fix `dateKey` React key | `MessageList.jsx` | None | No "missing key" console warning |
| 3.2 | Replace deprecated `onKeyPress` | `MessageInput.jsx` | None | Enter key still sends messages |
| 3.3 | Update `index.html` title | `client/index.html` | None | Tab shows "Quick Chat" |
| 3.4 | Fix email template URLs | `auth.template.js` | None | Emails link to config-based URLs |
| 3.5 | Make TLS conditional | `sendmail.js` | None | `rejectUnauthorized: false` only in dev |

---

## Phase 4 — Low (Cleanup & Security)

**Goal:** Remove dead code, fix filenames, rotate exposed credentials.

| Step | Task | Files | Dependency | Acceptance Criteria |
|------|------|-------|------------|---------------------|
| 4.1 | Rename typo files + update imports | `auth.middlware.js`, `asyncHanlder.js` + all importers | None | `require` paths match new filenames |
| 4.2 | Remove dead `socket.service.js` | `services/socket.service.js` | None | No imports break |
| 4.3 | Remove unused model methods | `User.js`, `Conversation.model.js`, `Message.model.js` | None | App compiles and runs |
| 4.4 | Rotate exposed credentials | `server/.env` | None | Old secrets invalidated ✅ |

---

## Dependency Graph

```
Phase 1 (Critical)
├── 1.1  ← No dependencies
├── 1.2  ← No dependencies
├── 1.3  ← No dependencies
├── 1.4  ← No dependencies
└── 1.5  ← No dependencies

Phase 2 (High)
├── 2.1  ← No dependencies
├── 2.2  ← Depends on 1.3 (socket must connect)
├── 2.3  ← No dependencies
└── 2.4  ← No dependencies

Phase 3 (Medium)
├── 3.1–3.5  ← No dependencies on earlier phases (independent cleanup)

Phase 4 (Low)
├── 4.1  ← Cascading import updates needed
├── 4.2–4.4  ← No dependencies
```

---

## Rollback Strategy

Each step is atomic. Before modifying a file, a backup `*.bak` copy is created in the same directory. If verification fails, the `.bak` is restored and the step is re-attempted with a different approach.
