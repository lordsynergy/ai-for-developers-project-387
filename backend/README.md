# Calendar Booking Backend

Rails 8 API backend for the Calendar Booking OpenAPI contract.

## Setup

```bash
cd backend
bundle install
bundle exec rails db:migrate db:seed
```

## Run

```bash
cd backend
bundle exec rails server
```

The API runs on `http://localhost:3000` by default.

## Environment

Optional local values:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password
FRONTEND_ORIGIN=http://localhost:5173
```

## Test

```bash
cd backend
bundle exec rspec
```

## Frontend

Point the frontend to this backend with:

```bash
VITE_API_BASE_URL=http://localhost:3000
```
