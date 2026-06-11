# EP-12: Offline Sync Engine

> **Epic ID:** EP-12  
> **Priority:** P1  
> **Estimated Sprints:** 3  
> **Phase:** 2–3  
> **Related Docs:** [10-offline-architecture](../10-offline-architecture.md) · [PROMPT-04](../12-cursor-prompts/PROMPT-04-teacher-app.md)

---

## Business Objective

Indian schools frequently operate in environments with unreliable internet connectivity. Teachers cannot miss an attendance marking window because their phone's 4G dropped. The offline sync engine is the reliability foundation that makes Vitana viable in real Indian school conditions.

## Technical Objective

Implement SQLite-based offline storage with an idempotent write queue, automatic sync-on-reconnect, conflict resolution, and a data pre-fetch bundle for low-connectivity scenarios.

---

## Current State Analysis

No offline support exists in the web application. The mobile app must build this from scratch. The backend is stateless and supports idempotent operations via `X-Idempotency-Key` header (to be added as part of this epic).

---

## What Works Offline

| Operation | Offline Support | Sync Strategy |
|---|---|---|
| View timetable | ✅ SQLite cache | Auto-refresh on reconnect |
| View announcements | ✅ TanStack Query cache | Auto-refresh on reconnect |
| View attendance history | ✅ TanStack Query cache | Auto-refresh on reconnect |
| **Mark attendance** | ✅ Queue | Flush on reconnect |
| View fee summary | ✅ TanStack Query cache | Auto-refresh |
| **Post diary entry** | ✅ Queue | Flush on reconnect |
| **Apply for leave** | ✅ Queue | Flush on reconnect |
| **Text assignment submission** | ✅ Queue | Flush on reconnect |
| File upload | ✗ Online only | — |
| Fee payment | ✗ Online only | — |
| Online exam | ✗ Online only | — |

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Student list cached in SQLite per class (for attendance marking) |
| FR-2 | Timetable cached in SQLite (per class, per academic year) |
| FR-3 | Attendance marking works when no network connectivity |
| FR-4 | Leave applications submitted offline are queued |
| FR-5 | Diary entries created offline are queued |
| FR-6 | All queued items have an idempotency key to prevent duplicate submissions |
| FR-7 | Queue processes automatically on connectivity restoration |
| FR-8 | Queue processes when app comes to foreground |
| FR-9 | Conflict detection: server returns 409 → UI presents resolution options |
| FR-10 | Failed sync items show with error reason, manual retry available |
| FR-11 | Sync status visible to user (pending count, syncing state) |
| FR-12 | Stale cached data shown with "As of [time]" indicator |
| FR-13 | Offline bundle endpoint prefetches key data at morning login |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | SQLite operations complete in < 10ms (WAL mode) |
| NFR-2 | Queue processing doesn't block the UI thread |
| NFR-3 | SQLite database total size < 50 MB (enforced with alerts at 40 MB) |
| NFR-4 | Cached student list serves 40 students in < 50ms |
| NFR-5 | Queue processes all pending items within 5 seconds of connectivity restoration |

---

## API Requirements

| Method | Endpoint | Status | Notes |
|---|---|---|---|
| GET | `/api/mobile/offline-bundle` | TO BUILD | Pre-fetch bundle |
| POST | `/api/attendance/students/bulk` | Exists | Add idempotency key support |
| POST | `/api/diary` | Exists | Add idempotency key support |
| POST | `/api/leavemanagement/student-leave` | Exists | Add idempotency key support |
| POST | `/api/assignments/{id}/submissions` | Exists | Add idempotency key support |

Backend must handle `X-Idempotency-Key` header: if same key submitted twice, return success with the original response (no duplicate processing).

---

## User Stories

**EP-12-US-01: Offline attendance marking** (SP: 8)
**EP-12-US-02: Pending sync status indicator** (SP: 3)
**EP-12-US-03: Conflict resolution UI** (SP: 5)
**EP-12-US-04: Morning offline bundle** (SP: 5)
**EP-12-US-05: SQLite cleanup and size management** (SP: 3)

**Total:** 24 story points / 3 sprints

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 8 | SQLite setup, offline queue, attendance offline (foundational) |
| Sprint 12 | Marks entry offline drafts, conflict resolution UI |
| Sprint 15 | Offline bundle endpoint, bundle pre-fetch logic, size management |

---

## Monitoring

- Amplitude: `offline_operations_queued` (count by type per session).
- Amplitude: `offline_sync_success_rate` (successful / total submissions from queue).
- Sentry: `OfflineSyncConflict` error events.
- Internal: SQLite size > 40 MB → Sentry warning.
