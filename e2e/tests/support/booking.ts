import { expect, Page } from '@playwright/test';

type BookingInput = {
  guestName: string;
  guestEmail: string;
};

type SelectedSlot = {
  dateText: string;
  timeLabel: string;
  timeValue: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDateText(label: string | null) {
  const match = label?.match(/^Выбрать дату (.+), свободных слотов:/);
  if (!match) {
    throw new Error(`Unexpected date button label: ${label}`);
  }

  return match[1];
}

export async function openPublicBookingPage(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Бронирование встреч' })).toBeVisible();
  await page.getByLabel('Выберите тип встречи').selectOption({ value: 'intro-call' });
}

export async function selectFirstAvailableSlot(page: Page): Promise<SelectedSlot> {
  const dateButton = page.getByRole('button', { name: /^Выбрать дату / }).first();
  await expect(dateButton).toBeEnabled();

  const dateText = parseDateText(await dateButton.getAttribute('aria-label'));
  await dateButton.click();

  const timeSelect = page.getByLabel('Доступное время');
  await expect(timeSelect).toBeEnabled();

  const firstOption = timeSelect.locator('option').nth(1);
  const timeValue = await firstOption.getAttribute('value');
  const timeLabel = (await firstOption.textContent())?.trim();

  if (!timeValue || !timeLabel) {
    throw new Error('No available time option found');
  }

  await timeSelect.selectOption(timeValue);

  return { dateText, timeLabel, timeValue };
}

export async function selectDateByText(page: Page, dateText: string) {
  await page.getByRole('button', { name: new RegExp(`^Выбрать дату ${escapeRegExp(dateText)},`) }).click();
}

export async function bookSelectedSlot(page: Page, input: BookingInput) {
  await page.getByLabel('Имя').fill(input.guestName);
  await page.getByLabel('Email').fill(input.guestEmail);
  await page.getByRole('button', { name: 'Забронировать выбранное время' }).click();
}

export async function bookFirstAvailableSlot(page: Page, input: BookingInput) {
  await openPublicBookingPage(page);
  const selectedSlot = await selectFirstAvailableSlot(page);
  await bookSelectedSlot(page, input);
  await expect(page.getByText(/Бронирование создано:/)).toBeVisible();

  return selectedSlot;
}
