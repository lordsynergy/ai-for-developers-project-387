import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const backendDir = resolve(import.meta.dirname, '../../../backend');

export function resetTestDatabase() {
  execFileSync('bundle', ['exec', 'rails', 'db:prepare'], {
    cwd: backendDir,
    env: {
      ...process.env,
      RAILS_ENV: 'test',
    },
    stdio: 'inherit',
  });

  execFileSync('bundle', ['exec', 'rails', 'runner', 'Booking.delete_all; load Rails.root.join("db/seeds.rb")'], {
    cwd: backendDir,
    env: {
      ...process.env,
      RAILS_ENV: 'test',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'password',
      FRONTEND_ORIGIN: process.env.E2E_FRONTEND_URL ?? 'http://127.0.0.1:5173',
    },
    stdio: 'inherit',
  });
}
