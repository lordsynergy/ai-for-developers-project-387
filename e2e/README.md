# E2E tests

Playwright checks the main user flows in a real browser against the real Rails backend and Vite frontend.

## Install

```bash
cd e2e
npm ci
```

Playwright can use your system Google Chrome:

```bash
npm run test:system-chrome
```

For CI or a fully reproducible local browser, install Playwright-managed Chromium:

```bash
npx playwright install --with-deps chromium
```

## Run

```bash
cd e2e
npm test
```

The Playwright config starts:

- Rails backend on `http://127.0.0.1:3000` with `RAILS_ENV=test`;
- Vite frontend on `http://127.0.0.1:5173`;
- frontend API URL via `VITE_API_BASE_URL=http://127.0.0.1:3000`.

Before each test, the test database is reset to seed data and bookings are removed.
Playwright starts fresh backend/frontend processes by default. To reuse already running local servers, set:

```bash
E2E_REUSE_EXISTING_SERVER=1 npm run test:system-chrome
```

## Useful commands

```bash
npm run test:headed
npm run test:system-chrome
npm run test:report
```

## Covered scenarios

- guest books the first available slot;
- booked slot disappears from available times after refreshing slots;
- stale booking form shows a conflict when another guest booked the same slot;
- admin logs in and sees a booking created by a guest.
