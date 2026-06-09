export const dayNames: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};

function parseIsoParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4] ?? '00',
    minute: match[5] ?? '00',
  };
}

function dateFromParts(value: string) {
  const parts = parseIsoParts(value);

  if (!parts) {
    return new Date(value);
  }

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
}

export function formatDateTime(value: string) {
  return `${formatDateWithoutWeekday(value)}, ${formatTime(value)}`;
}

export function formatTimeRange(start: string, end: string) {
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

export function formatTime(value: string) {
  const parts = parseIsoParts(value);

  if (!parts) {
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  return `${parts.hour}:${parts.minute}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(dateFromParts(value));
}

export function formatMonthYear(value: string) {
  if (!value) return '';
  const date = dateFromParts(value);
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' }).format(date);
  const year = String(date.getUTCFullYear());
  return `${month} ${year}`;
}

export function toDateKey(value: string) {
  return value.slice(0, 10);
}

function formatDateWithoutWeekday(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateFromParts(value));
}
