# Development Plan

## Project Context

This is a calendar booking application inspired by Cal.com. The core functionality is already implemented: the owner configures event types and weekly availability, the guest browses public slots for the next 14 days and books a suitable time.

## Goal

The goal of this stage is not to write a major new feature, but to integrate OpenCode into the GitHub development workflow: creating issues, task triage, pull requests, reviews, follow-up changes, and regular automated checks.

## Planned Issues

### 1. [Bug] Missing eventTypeId returns 404 instead of 400

**Problem:**
`POST /api/public/bookings` without `eventTypeId` currently may be handled as `not found`, because the backend tries to find an event type by a missing slug. Missing required input should be treated as `400 Bad Request`.

**Acceptance criteria:**
- Add a regression request spec.
- `POST /api/public/bookings` without `eventTypeId` returns `400 Bad Request`.
- The response format is consistent with other API errors.
- Existing specs pass.

**Possible files:** `backend/app/controllers/api/public/bookings_controller.rb`, `backend/app/services/bookings/creator.rb`, `backend/spec/requests/public_api_spec.rb`

**Labels:** backend, bug, tests

**Priority:** High

---

### 2. [Bug] Race condition when switching event types on the public page

**Problem:**
When a user quickly switches between event types, an older slots request may finish after a newer one and overwrite the current slots state.

**Acceptance criteria:**
- Prevent stale slot responses from updating the UI.
- Use `AbortController` or another explicit stale-request guard.
- Add a test or document a manual verification scenario.
- Existing frontend build/checks pass.

**Possible files:** `frontend/src/App.tsx`, `frontend/src/api/client.ts`

**Labels:** frontend, bug, ux

**Priority:** Medium

---

### 3. [UX] Expired admin token keeps frontend in authenticated state

**Problem:**
The backend returns token expiration information, but the frontend stores only the token. After the token expires, the UI may still look authenticated while API requests fail with `401`.

**Acceptance criteria:**
- Store and validate token expiration, or handle `401` responses globally.
- Expired sessions redirect the user to the login screen.
- Admin state is cleared when the session is no longer valid.
- Existing frontend checks pass.

**Possible files:** `frontend/src/api/client.ts`, `frontend/src/App.tsx`

**Labels:** frontend, ux, auth

**Priority:** Medium

---

### 4. [Tests] Add missing negative request specs

**Problem:**
The backend already has several negative tests, but some important invalid public API cases are still worth covering.

**Cases to cover (if not already covered by issue #1):**
- `POST /api/public/bookings` with invalid `guestEmail`.
- `GET /api/public/event-types/:id/slots` for a non-existent event type.
- Unauthorized access for the main admin endpoints (profile, availability-rules, bookings).

**Acceptance criteria:**
- Add focused request specs for the missing negative cases.
- Do not duplicate existing tests.
- Existing specs pass.

**Possible files:** `backend/spec/requests/public_api_spec.rb`, `backend/spec/requests/admin_api_spec.rb`

**Labels:** backend, tests

**Priority:** Medium

---

### 5. [CI] Audit GitHub Actions workflows

**Problem:**
The repository should use supported GitHub Actions versions. The task is to verify the current workflow versions and ensure the workflows are useful and do not have unexpected behavior. Do not blindly downgrade actions.

**Acceptance criteria:**
- Verify current versions of `actions/checkout`, `actions/setup-node`, and `actions/upload-artifact`.
- Update only unsupported or outdated actions.
- Keep useful checks such as `frontend build`.
- The workflow passes on pull requests.

**Possible files:** `.github/workflows/e2e.yml`, `.github/workflows/opencode-*.yml`, `.github/workflows/hexlet-check.yml`

**Labels:** ci, github-actions

**Priority:** Medium

---

### 6. [Automation] Add scheduled Lighthouse workflow

**Problem:**
The project needs a scheduled workflow that demonstrates regular automated checks.

**Acceptance criteria:**
- Add a GitHub Actions workflow with `schedule` and `workflow_dispatch` triggers.
- Start the application or frontend preview server before running Lighthouse.
- Run a Lighthouse check against the frontend.
- Upload the Lighthouse report as a workflow artifact.
- Document how to find the report in GitHub Actions.

**Possible files:** Create `.github/workflows/nightly.yml`, add `lighthouserc.json` in `frontend/`

**Labels:** ci, automation, lighthouse

**Priority:** High

---

## First recommended OpenCode issue

Start with:

**[Bug] Missing eventTypeId returns 404 instead of 400**

This is a small backend task with clear acceptance criteria, suitable for the first full cycle: issue → triage → pull request → review → follow-up changes.