import { expect, test } from '@playwright/test';
import { bookFirstAvailableSlot, bookSelectedSlot, openPublicBookingPage, selectDateByText, selectFirstAvailableSlot } from './support/booking';
import { resetTestDatabase } from './support/database';

test.beforeEach(() => {
  resetTestDatabase();
});

test('guest can book an available slot', async ({ page }) => {
  await bookFirstAvailableSlot(page, {
    guestName: 'Anna Ivanova',
    guestEmail: 'anna@example.com',
  });
});

test('booked slot is no longer available after refreshing slots', async ({ page }) => {
  const selectedSlot = await bookFirstAvailableSlot(page, {
    guestName: 'Anna Ivanova',
    guestEmail: 'anna@example.com',
  });

  await openPublicBookingPage(page);
  await selectDateByText(page, selectedSlot.dateText);

  await expect(page.getByLabel('Доступное время')).not.toContainText(selectedSlot.timeLabel);
});

test('stale page shows conflict when selected slot was booked by another guest', async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstGuestPage = await firstContext.newPage();
  const secondGuestPage = await secondContext.newPage();

  try {
    await openPublicBookingPage(firstGuestPage);
    const selectedSlot = await selectFirstAvailableSlot(firstGuestPage);

    await openPublicBookingPage(secondGuestPage);
    await selectDateByText(secondGuestPage, selectedSlot.dateText);
    await secondGuestPage.getByLabel('Доступное время').selectOption(selectedSlot.timeValue);
    await bookSelectedSlot(secondGuestPage, {
      guestName: 'Boris Ivanov',
      guestEmail: 'boris@example.com',
    });
    await expect(secondGuestPage.getByText(/Бронирование создано:/)).toBeVisible();

    await bookSelectedSlot(firstGuestPage, {
      guestName: 'Anna Ivanova',
      guestEmail: 'anna@example.com',
    });
    await expect(firstGuestPage.getByText('Выбранное время уже занято')).toBeVisible();
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
