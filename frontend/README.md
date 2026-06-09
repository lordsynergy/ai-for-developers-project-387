# Calendar Booking Frontend

React + TypeScript + Vite frontend for the Calendar Booking API.

## Install

```bash
cd frontend
npm install
```

## Run with Prism mock API

From the project root:

```bash
npx @stoplight/prism-cli mock spec/openapi/openapi.yaml --port 4010
```

In another terminal:

```bash
cd frontend
cp .env.example .env
npm run dev
```

Example `.env`:

```bash
VITE_API_BASE_URL=http://localhost:4010
```

For a future backend, point `VITE_API_BASE_URL` to that server, for example `http://localhost:3000`.

## Build

```bash
cd frontend
npm run build
```
