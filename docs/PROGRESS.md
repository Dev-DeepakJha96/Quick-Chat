# Progress Tracker — Quick-Chat Recovery

> **Status:** In Progress  
> **Phase:** Pre-Recovery (Documentation)  
> **Last Updated:** 2026-07-03

---

## Phase 0 — Documentation (Current)

- [x] Create `/docs` directory
- [x] Write `MASTER_PLAN.md`
- [x] Write `BUG_LIST.md`
- [x] Write `ARCHITECTURE.md`
- [x] Write `PROGRESS.md`
- [x] Write `CHANGELOG.md`

---

## Phase 1 — Critical (App Cannot Function)

**Goal:** Core flow works — register → login → search → create conversation → message.

| # | Task | Status | Verified |
|---|------|--------|----------|
| 1.1 | Fix `_id` → `id` transform in models | Done | ✅ |
| 1.2 | Add `GET /users/search` backend route | Done | ✅ |
| 1.3 | Fix socket token cookie lookup | Done | ✅ |
| 1.4 | Fix pagination response path | Done | ✅ |
| 1.5 | Fix `npm start` path | Done | ✅ |

**Phase 1 Total:** 5 / 5 ✅

---

## Phase 2 — High (Major Features Broken)

**Goal:** All feature paths working, frontend/backend contracts aligned.

| # | Task | Status | Verified |
|---|------|--------|----------|
| 2.1 | Fix `updateProfile` endpoint path | Done | ✅ |
| 2.2 | Add missing socket event handlers | Done | ✅ |
| 2.3 | Align password validation | Done | ✅ |
| 2.4 | Add missing auth routes + pages | Done | ✅ |

**Phase 2 Total:** 4 / 4 ✅

---

## Phase 3 — Medium (Feature Degradation)

**Goal:** Eliminate warnings, UI issues, email gaps.

| # | Task | Status | Verified |
|---|------|--------|----------|
| 3.1 | Fix `dateKey` React key | Pending | — |
| 3.2 | Replace deprecated `onKeyPress` | Pending | — |
| 3.3 | Update `index.html` title | Pending | — |
| 3.4 | Fix email template URLs | Pending | — |
| 3.5 | Make TLS conditional | Pending | — |

**Phase 3 Total:** 0 / 5

---

## Phase 4 — Low (Cleanup & Security)

**Goal:** Remove dead code, fix filenames, rotate credentials.

| # | Task | Status | Verified |
|---|------|--------|----------|
| 4.1 | Rename typo files + update imports | Pending | — |
| 4.2 | Remove dead `socket.service.js` | Pending | — |
| 4.3 | Remove unused model methods | Pending | — |
| 4.4 | Rotate exposed credentials | Pending | — |

**Phase 4 Total:** 0 / 4

---

## Overall Progress

| Phase | Total | Done | Remaining |
|-------|-------|------|-----------|
| 0 — Docs | 6 | 6 | 0 ✅ |
| 1 — Critical | 5 | 0 | 5 |
| 2 — High | 4 | 0 | 4 |
| 3 — Medium | 5 | 0 | 5 |
| 4 — Low | 4 | 0 | 4 |
| **All** | **24** | **6** | **18** |
