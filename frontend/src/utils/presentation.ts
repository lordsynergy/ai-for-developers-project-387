import { EventType } from '../api/client';

const eventTypeFallbacks = [
  {
    title: 'Intro call',
    description: 'Короткая встреча-знакомство, чтобы обсудить задачу и следующий шаг.',
    durationMinutes: 30,
  },
  {
    title: 'Консультация',
    description: 'Разбор вопроса, план действий и ответы на ваши вопросы.',
    durationMinutes: 45,
  },
  {
    title: 'Demo call',
    description: 'Демонстрация продукта или решения с обсуждением деталей.',
    durationMinutes: 60,
  },
];

function fallbackForEventType(index: number) {
  return eventTypeFallbacks[index % eventTypeFallbacks.length];
}

function isPrismPlaceholder(value: string | undefined) {
  return !value?.trim() || value.trim().toLowerCase() === 'string';
}

function isPrismEventType(eventType: EventType | undefined) {
  return Boolean(
    eventType &&
      isPrismPlaceholder(eventType.id) &&
      isPrismPlaceholder(eventType.title) &&
      isPrismPlaceholder(eventType.description) &&
      eventType.durationMinutes === 1,
  );
}

function readableText(value: string | undefined, fallback: string) {
  const text = value?.trim();
  return isPrismPlaceholder(text) ? fallback : text;
}

export function displayEventTypeTitle(eventType: EventType | undefined, index: number) {
  return isPrismEventType(eventType) ? fallbackForEventType(index).title : readableText(eventType?.title, fallbackForEventType(index).title);
}

export function displayEventTypeDescription(eventType: EventType | undefined, index: number) {
  return isPrismEventType(eventType)
    ? fallbackForEventType(index).description
    : readableText(eventType?.description, fallbackForEventType(index).description);
}

export function displayDurationMinutes(eventType: EventType | undefined, index: number) {
  return isPrismEventType(eventType) ? fallbackForEventType(index).durationMinutes : eventType?.durationMinutes || fallbackForEventType(index).durationMinutes;
}

export function minutesLabel(minutes: number | undefined) {
  const value = minutes && minutes > 0 ? minutes : 30;
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;
  const word = lastDigit === 1 && lastTwoDigits !== 11 ? 'минута' : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? 'минуты' : 'минут';
  return `${value} ${word}`;
}
