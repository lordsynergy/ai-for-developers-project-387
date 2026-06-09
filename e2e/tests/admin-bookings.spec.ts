import { expect, test } from '@playwright/test';
import { bookFirstAvailableSlot } from './support/booking';
import { resetTestDatabase } from './support/database';

test.beforeEach(() => {
  resetTestDatabase();
});

test('admin sees booking created by a guest', async ({ page }) => {
  await bookFirstAvailableSlot(page, {
    guestName: 'Elena Petrova',
    guestEmail: 'elena@example.com',
  });

  await page.getByRole('button', { name: 'Вход' }).click();
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Пароль').fill('password');
  await page.getByRole('button', { name: 'Войти' }).click();

  await page.getByRole('button', { name: 'Бронирования' }).click();

  await expect(page.getByText('Elena Petrova')).toBeVisible();
  await expect(page.getByText('elena@example.com')).toBeVisible();
  await expect(page.getByText('Intro call')).toBeVisible();
});
