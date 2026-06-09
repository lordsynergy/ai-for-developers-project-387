import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  api,
  ApiError,
  AvailabilityRule,
  AvailabilityRuleInput,
  Booking,
  EventType,
  EventTypeCreateRequest,
  EventTypeUpdateRequest,
  getStoredAdminToken,
  NetworkError,
  Slot,
} from './api/client';
import { dayNames, formatDate, formatDateTime, formatMonthYear, formatTime, formatTimeRange, toDateKey } from './utils/format';
import { displayDurationMinutes, displayEventTypeDescription, displayEventTypeTitle, minutesLabel } from './utils/presentation';

type Route = 'public' | 'admin-login' | 'admin-event-types' | 'admin-availability' | 'admin-bookings';

type Notice = {
  type: 'success' | 'error';
  message: string;
};

type LoadState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

const emptyEventTypeForm: EventTypeCreateRequest = {
  id: '',
  title: '',
  description: '',
  durationMinutes: 30,
};

const eventTypeDescriptionMaxLength = 240;
const eventTypeIdMaxLength = 48;
const eventTypeTitleMaxLength = 40;
const eventTypeDurationMaxMinutes = 480;
const guestNameMaxLength = 60;
const guestEmailMaxLength = 120;

const defaultRules: AvailabilityRuleInput[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '10:00',
  endTime: '18:00',
}));

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  slotsCount: number;
};

const apiMessageTranslations: Record<string, string> = {
  'Availability rules must not overlap': 'Правила рабочего времени не должны пересекаться',
  'rules must be an array': 'Правила рабочего времени должны быть массивом',
  'rules must be an array of objects': 'Правила должны быть списком объектов',
  'rules must include dayOfWeek, startTime and endTime': 'Правило должно содержать день, начало и конец',
  'Event type already exists': 'Тип встречи с таким ID уже существует',
  'Invalid or missing admin token': 'Нужен действующий токен администратора',
  'Invalid email or password': 'Неверный email или пароль',
  'Selected startAt is not an available slot': 'Выбранное время недоступно для записи',
  'Selected slot is already booked': 'Выбранное время уже занято',
  'guestName and guestEmail are required': 'Укажите имя и email гостя',
  'guestName must be 60 characters or less': 'Имя должно быть не длиннее 60 символов',
  'guestEmail must be 120 characters or less': 'Email должен быть не длиннее 120 символов',
  'guestEmail must be a valid email': 'Укажите корректный email',
  'Event type not found': 'Тип встречи не найден',
  'startAt must be a valid ISO 8601 date-time': 'Передайте дату и время в корректном ISO 8601 формате',
  'Resource not found': 'Ресурс не найден',
};

function localizeApiMessage(message: string) {
  return apiMessageTranslations[message] ?? message;
}

function toMessage(error: unknown) {
  if (error instanceof ApiError) {
    return localizeApiMessage(error.message);
  }

  if (error instanceof NetworkError) {
    return 'Не удалось подключиться к API. Проверьте, что backend запущен и адрес API указан верно.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Что-то пошло не так. Попробуйте ещё раз.';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function dateKeyToUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateToDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildCalendarDays(anchorDateKey: string, slotCounts: Map<string, number>): CalendarDay[] {
  const anchor = dateKeyToUtcDate(anchorDateKey);
  const month = anchor.getUTCMonth();
  const firstDay = new Date(Date.UTC(anchor.getUTCFullYear(), month, 1));
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setUTCDate(firstDay.getUTCDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const dateKey = utcDateToDateKey(date);

    return {
      dateKey,
      dayNumber: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      slotsCount: slotCounts.get(dateKey) ?? 0,
    };
  });
}

function App() {
  const [route, setRoute] = useState<Route>(() => (getStoredAdminToken() ? 'admin-event-types' : 'public'));
  const [isAuthed, setIsAuthed] = useState(Boolean(getStoredAdminToken()));

  const navigate = (nextRoute: Route) => {
    setRoute(nextRoute);
  };

  const handleLogout = async () => {
    await api.admin.logout();
    setIsAuthed(false);
    setRoute('public');
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Бронирование встреч</h1>
        </div>
        <nav className="nav" aria-label="Основная навигация">
          <button className={route === 'public' ? 'active' : ''} onClick={() => navigate('public')}>
            Публичная страница
          </button>
          {isAuthed ? (
            <>
              <button
                className={route === 'admin-event-types' ? 'active' : ''}
                onClick={() => navigate('admin-event-types')}
              >
                Типы встреч
              </button>
              <button
                className={route === 'admin-availability' ? 'active' : ''}
                onClick={() => navigate('admin-availability')}
              >
                Рабочее время
              </button>
              <button
                className={route === 'admin-bookings' ? 'active' : ''}
                onClick={() => navigate('admin-bookings')}
              >
                Бронирования
              </button>
              <button onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <button className={route === 'admin-login' ? 'active' : ''} onClick={() => navigate('admin-login')}>
              Вход
            </button>
          )}
        </nav>
      </header>

      <main>
        {route === 'public' && <PublicBookingPage />}
        {route === 'admin-login' && (
          <AdminLoginPage
            onLogin={() => {
              setIsAuthed(true);
              setRoute('admin-event-types');
            }}
          />
        )}
        {route === 'admin-event-types' && <Protected authed={isAuthed} onLogin={() => navigate('admin-login')} page={<AdminEventTypesPage />} />}
        {route === 'admin-availability' && <Protected authed={isAuthed} onLogin={() => navigate('admin-login')} page={<AdminAvailabilityPage />} />}
        {route === 'admin-bookings' && <Protected authed={isAuthed} onLogin={() => navigate('admin-login')} page={<AdminBookingsPage />} />}
      </main>
    </div>
  );
}

function Protected({ authed, onLogin, page }: { authed: boolean; onLogin: () => void; page: ReactNode }) {
  if (authed) {
    return page;
  }

  return (
    <section className="panel narrow">
      <h2>Нужен вход</h2>
      <p className="muted">Административные страницы доступны только с Bearer token.</p>
      <button className="primary" onClick={onLogin}>
        Перейти ко входу
      </button>
    </section>
  );
}

function PublicBookingPage() {
  const [eventTypes, setEventTypes] = useState<LoadState<EventType[]>>({ data: [], loading: true, error: null });
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>('');
  const [slots, setSlots] = useState<LoadState<Slot[]>>({ data: [], loading: false, error: null });
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [calendarAnchor, setCalendarAnchor] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadEventTypes();
  }, []);

  useEffect(() => {
    if (!selectedEventTypeId) {
      setSlots({ data: [], loading: false, error: null });
      setSelectedSlot(null);
      return;
    }

    void loadSlots(selectedEventTypeId);
  }, [selectedEventTypeId]);

  const selectedEventTypeIndex = eventTypes.data.findIndex((eventType) => eventType.id === selectedEventTypeId);
  const safeSelectedEventTypeIndex = selectedEventTypeIndex >= 0 ? selectedEventTypeIndex : 0;
  const selectedEventType = eventTypes.data[selectedEventTypeIndex];
  const selectedEventDuration = displayDurationMinutes(selectedEventType, safeSelectedEventTypeIndex);
  const availableDateKeys = useMemo(() => {
    return Array.from(new Set(slots.data.map((slot) => toDateKey(slot.startAt)))).sort();
  }, [slots.data]);
  const slotCountsByDate = useMemo(() => {
    return slots.data.reduce((counts, slot) => {
      const dateKey = toDateKey(slot.startAt);
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
  }, [slots.data]);
  useEffect(() => {
    if (availableDateKeys.length > 0) {
      setCalendarAnchor((current) => current || availableDateKeys[0]);
    }
  }, [availableDateKeys]);

  function goToPrevMonth() {
    const anchor = calendarAnchor || availableDateKeys[0] || utcDateToDateKey(new Date());
    const date = dateKeyToUtcDate(anchor);
    date.setUTCMonth(date.getUTCMonth() - 1);
    setCalendarAnchor(utcDateToDateKey(date));
  }

  function goToNextMonth() {
    const anchor = calendarAnchor || availableDateKeys[0] || utcDateToDateKey(new Date());
    const date = dateKeyToUtcDate(anchor);
    date.setUTCMonth(date.getUTCMonth() + 1);
    setCalendarAnchor(utcDateToDateKey(date));
  }

  function handleDateSelect(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedSlot(null);
    setCalendarAnchor(dateKey);
  }

  const calendarDays = useMemo(() => {
    return buildCalendarDays(calendarAnchor || availableDateKeys[0] || utcDateToDateKey(new Date()), slotCountsByDate);
  }, [calendarAnchor, availableDateKeys, slotCountsByDate]);
  const slotsForSelectedDate = slots.data.filter((slot) => toDateKey(slot.startAt) === selectedDateKey);
  const selectedDateLabel = selectedDateKey ? formatDate(`${selectedDateKey}T12:00:00`) : '';
  const calendarTitle = formatMonthYear(`${calendarDays.find((day) => day.inMonth)?.dateKey ?? utcDateToDateKey(new Date())}T12:00:00`);
  const selectedEventTitle = displayEventTypeTitle(selectedEventType, safeSelectedEventTypeIndex);
  const selectedEventDescription = displayEventTypeDescription(selectedEventType, safeSelectedEventTypeIndex);

  useEffect(() => {
    if (!selectedDateKey) {
      setSelectedSlot(null);
      return;
    }

    setSelectedSlot((current) => {
      if (current && toDateKey(current.startAt) === selectedDateKey) {
        return current;
      }

      return null;
    });
  }, [selectedDateKey]);

  async function loadEventTypes() {
    setEventTypes((state) => ({ ...state, loading: true, error: null }));
    try {
      const data = await api.public.listEventTypes();
      setEventTypes({ data, loading: false, error: null });
    } catch (error) {
      setEventTypes({ data: [], loading: false, error: toMessage(error) });
    }
  }

  async function loadSlots(eventTypeId: string) {
    setSlots({ data: [], loading: true, error: null });
    setSelectedSlot(null);
    setSelectedDateKey('');
    try {
      const data = await api.public.getSlots(eventTypeId);
      setSlots({ data, loading: false, error: null });
    } catch (error) {
      setSlots({ data: [], loading: false, error: toMessage(error) });
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);

    if (!selectedEventTypeId || !selectedSlot) {
      setNotice({ type: 'error', message: 'Выберите тип встречи и свободный слот.' });
      return;
    }

    if (!guestName.trim()) {
      setNotice({ type: 'error', message: 'Укажите имя гостя.' });
      return;
    }

    if (guestName.trim().length > guestNameMaxLength) {
      setNotice({ type: 'error', message: `Имя должно быть не длиннее ${guestNameMaxLength} символов.` });
      return;
    }

    if (guestEmail.trim().length > guestEmailMaxLength) {
      setNotice({ type: 'error', message: `Email должен быть не длиннее ${guestEmailMaxLength} символов.` });
      return;
    }

    if (!isEmail(guestEmail)) {
      setNotice({ type: 'error', message: 'Укажите корректный email.' });
      return;
    }

    setSubmitting(true);
    try {
      const booking = await api.public.createBooking({
        eventTypeId: selectedEventTypeId,
        startAt: selectedSlot.startAt,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
      });
      setNotice({
        type: 'success',
        message: `Бронирование создано: ${booking.eventTypeTitle}, ${formatTimeRange(booking.startsAt, booking.endsAt)}.`,
      });
      setGuestName('');
      setGuestEmail('');
      await loadSlots(selectedEventTypeId);
    } catch (error) {
      setNotice({ type: 'error', message: toMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="public-page">
      <div className="public-intro">
        <div>
          <h2>Выберите дату и время встречи</h2>
        </div>
        <div className="step-strip" aria-label="Шаги бронирования">
          <span className="done">1. Тип</span>
          <span className={selectedDateKey ? 'done' : ''}>2. Дата</span>
          <span className={selectedSlot ? 'done' : ''}>3. Время</span>
          <span>4. Контакты</span>
        </div>
      </div>

      <div className="booking-shell">
      <aside className="booking-host">
        <div className="avatar">CB</div>
        <p className="muted">Календарь владельца</p>
        <h2>{selectedEventType ? selectedEventTitle : 'Выберите встречу'}</h2>
        <p className="booking-description" title={selectedEventType ? selectedEventDescription : undefined}>
          {selectedEventType ? selectedEventDescription : 'Сначала выберите формат встречи.'}
        </p>
        <div className="meta-list">
          <span>{selectedEventType ? minutesLabel(selectedEventDuration) : 'Длительность встречи'}</span>
          <span>{availableDateKeys.length} доступных дат</span>
          <span>Бронирование без регистрации</span>
        </div>

        <div className="event-type-picker">
          <h3>Тип встречи</h3>
          <AsyncState loading={eventTypes.loading} error={eventTypes.error} onRetry={loadEventTypes} />
          {!eventTypes.loading && !eventTypes.error && eventTypes.data.length > 0 && (
            <>
              <select
                aria-label="Выберите тип встречи"
                className="event-type-select"
                value={selectedEventTypeId}
                onChange={(event) => setSelectedEventTypeId(event.target.value)}
              >
                <option value="" disabled>
                  Выберите формат
                </option>
                {eventTypes.data.map((eventType, index) => (
                  <option key={eventType.id} value={eventType.id}>
                    {displayEventTypeTitle(eventType, index)} · {minutesLabel(displayDurationMinutes(eventType, index))}
                  </option>
                ))}
              </select>
              {selectedEventType && (
                <div className="event-type-summary">
                  <div>
                    <strong>{selectedEventTitle}</strong>
                    <span>{minutesLabel(selectedEventDuration)}</span>
                  </div>
                  <p title={selectedEventDescription}>{selectedEventDescription}</p>
                </div>
              )}
            </>
          )}
          {!eventTypes.loading && !eventTypes.error && eventTypes.data.length === 0 && (
            <p className="muted">API не вернул доступных типов встреч.</p>
          )}
        </div>
      </aside>

      <section className="booking-calendar">
        <div className="calendar-heading calendar-heading-centered">
          <p className="eyebrow">Дата</p>
          <div className="calendar-title-row" aria-label="Навигация по месяцам">
            <button className="nav-arrow" onClick={goToPrevMonth} aria-label="Предыдущий месяц">‹</button>
            <h2>{calendarTitle}</h2>
            <button className="nav-arrow" onClick={goToNextMonth} aria-label="Следующий месяц">›</button>
          </div>
        </div>
        <p className="helper-text">Подсвеченные дни доступны для записи. Точка под датой показывает, что на этот день есть свободное время.</p>
        <AsyncState loading={slots.loading} error={slots.error} onRetry={() => selectedEventTypeId && loadSlots(selectedEventTypeId)} />
        <div className="weekday-row">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="date-grid" key={calendarTitle}>
          {calendarDays.map((day) => {
            const hasSlots = day.slotsCount > 0;
            return (
                <button
                  aria-label={
                    hasSlots
                      ? `Выбрать дату ${formatDate(`${day.dateKey}T12:00:00`)}, свободных слотов: ${day.slotsCount}`
                      : `${formatDate(`${day.dateKey}T12:00:00`)}, нет свободных слотов`
                  }
                  className={`date-cell ${selectedDateKey === day.dateKey ? 'selected' : ''} ${day.inMonth ? '' : 'outside'} ${hasSlots ? 'has-slots' : ''}`}
                  disabled={!hasSlots}
                  key={day.dateKey}
                  onClick={() => handleDateSelect(day.dateKey)}
                >
                <strong>{day.dayNumber}</strong>
                {hasSlots && <small>{day.slotsCount} сл.</small>}
              </button>
            );
          })}
        </div>
        {!slots.loading && !slots.error && selectedEventTypeId && slots.data.length === 0 && (
          <p className="muted">Для этого типа встречи API не вернул свободных слотов.</p>
        )}
      </section>

      <aside className="booking-slots">
        <div className="calendar-heading slots-heading">
          <p className="eyebrow">Время</p>
          <h2>{selectedDateLabel || 'Выберите дату'}</h2>
        </div>
        {selectedSlot && (
          <div className="selected-summary">
            <span>Выбрано</span>
            <strong>{formatTime(selectedSlot.startAt)} - {formatTime(selectedSlot.endAt)}</strong>
          </div>
        )}
        <label className="time-select-field">
          Доступное время
          <select
            value={selectedSlot?.startAt ?? ''}
            disabled={!selectedDateKey || slotsForSelectedDate.length === 0}
            onChange={(event) => {
              setSelectedSlot(slotsForSelectedDate.find((slot) => slot.startAt === event.target.value) ?? null);
            }}
          >
            <option value="">
              {selectedDateKey ? 'Выберите время' : 'Сначала выберите дату'}
            </option>
            {slotsForSelectedDate.map((slot) => (
              <option key={`${slot.eventTypeId}-${slot.startAt}`} value={slot.startAt}>
                {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
              </option>
            ))}
          </select>
        </label>
        {!slots.loading && !slots.error && !selectedDateKey && (
          <p className="muted">Выберите подсвеченную дату в календаре, чтобы увидеть доступное время.</p>
        )}
        {!slots.loading && !slots.error && selectedDateKey && slotsForSelectedDate.length === 0 && (
          <p className="muted">На выбранную дату слотов нет.</p>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <h3>Данные гостя</h3>
          <label>
            Имя
            <input
              value={guestName}
              maxLength={guestNameMaxLength}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Анна Иванова"
            />
          </label>
          <label>
            Email
            <input
              value={guestEmail}
              maxLength={guestEmailMaxLength}
              onChange={(event) => setGuestEmail(event.target.value)}
              placeholder="anna@example.com"
              type="email"
            />
          </label>
          <button className="primary" disabled={submitting || !selectedSlot}>
            {submitting ? 'Бронируем...' : selectedSlot ? 'Забронировать выбранное время' : 'Сначала выберите время'}
          </button>
        </form>
        <NoticeMessage notice={notice} />
      </aside>
      </div>
    </section>
  );
}

function AdminLoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);

    if (!isEmail(email)) {
      setNotice({ type: 'error', message: 'Укажите корректный email.' });
      return;
    }

    if (!password) {
      setNotice({ type: 'error', message: 'Введите пароль.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.admin.login({ email, password });
      onLogin();
    } catch (error) {
      setNotice({ type: 'error', message: toMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel narrow">
      <h2>Вход</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@example.com" />
        </label>
        <label>
          Пароль
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button className="primary" disabled={submitting}>
          {submitting ? 'Входим...' : 'Войти'}
        </button>
      </form>
      <NoticeMessage notice={notice} />
    </section>
  );
}

function AdminEventTypesPage() {
  const [state, setState] = useState<LoadState<EventType[]>>({ data: [], loading: true, error: null });
  const [form, setForm] = useState<EventTypeCreateRequest>(emptyEventTypeForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadEventTypes();
  }, []);

  async function loadEventTypes() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ data: await api.admin.listEventTypes(), loading: false, error: null });
    } catch (error) {
      setState({ data: [], loading: false, error: toMessage(error) });
    }
  }

  function edit(eventType: EventType) {
    setEditingId(eventType.id);
    setForm(eventType);
    setNotice(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyEventTypeForm);
  }

  function validateEventTypeForm() {
    if (!editingId && !/^[a-z0-9-]+$/.test(form.id)) {
      return 'ID должен содержать только строчные латинские буквы, цифры и дефисы. Например: intro-call.';
    }

    if (!editingId && form.id.length > eventTypeIdMaxLength) {
      return `ID должен быть не длиннее ${eventTypeIdMaxLength} символов.`;
    }

    if (!form.title.trim()) {
      return 'Укажите название типа встречи.';
    }

    if (form.title.trim().length > eventTypeTitleMaxLength) {
      return `Название должно быть не длиннее ${eventTypeTitleMaxLength} символов.`;
    }

    if (form.description.length > eventTypeDescriptionMaxLength) {
      return `Описание должно быть не длиннее ${eventTypeDescriptionMaxLength} символов.`;
    }

    if (!Number.isInteger(Number(form.durationMinutes)) || Number(form.durationMinutes) < 1 || Number(form.durationMinutes) > eventTypeDurationMaxMinutes) {
      return `Длительность должна быть целым числом от 1 до ${eventTypeDurationMaxMinutes} минут.`;
    }

    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);

    const validationError = validateEventTypeForm();
    if (validationError) {
      setNotice({ type: 'error', message: validationError });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const body: EventTypeUpdateRequest = {
          title: form.title.trim(),
          description: form.description,
          durationMinutes: Number(form.durationMinutes),
        };
        await api.admin.updateEventType(editingId, body);
        setNotice({ type: 'success', message: 'Тип встречи обновлён.' });
      } else {
        await api.admin.createEventType({
          id: form.id.trim(),
          title: form.title.trim(),
          description: form.description,
          durationMinutes: Number(form.durationMinutes),
        });
        setNotice({ type: 'success', message: 'Тип встречи создан.' });
      }
      resetForm();
      await loadEventTypes();
    } catch (error) {
      setNotice({ type: 'error', message: toMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(eventType: EventType) {
    setNotice(null);
    setSubmitting(true);
    try {
      await api.admin.deleteEventType(eventType.id);
      setNotice({ type: 'success', message: `Тип встречи "${eventType.title}" удалён.` });
      await loadEventTypes();
    } catch (error) {
      setNotice({ type: 'error', message: toMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid two-columns">
      <div className="panel">
        <h2>Admin: типы встреч</h2>
        <AsyncState loading={state.loading} error={state.error} onRetry={loadEventTypes} />
        <div className="list">
          {state.data.map((eventType) => {
            const details = `${eventType.id} · ${eventType.description || 'Без описания'}`;

            return (
              <div className="list-item" key={eventType.id}>
                <span>
                  <strong title={eventType.title}>{eventType.title}</strong>
                  <small title={details}>{details}</small>
                </span>
                <span className="actions">
                  <span className="pill">{eventType.durationMinutes} мин</span>
                  <button onClick={() => edit(eventType)}>Править</button>
                  <button className="danger" disabled={submitting} onClick={() => handleDelete(eventType)}>
                    Удалить
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <h2>{editingId ? 'Редактирование' : 'Создание типа встречи'}</h2>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            ID
            <input
              value={form.id}
              disabled={Boolean(editingId)}
              maxLength={eventTypeIdMaxLength}
              onChange={(event) => setForm({ ...form, id: event.target.value })}
              placeholder="intro-call"
            />
            <span className="field-hint">
              {form.id.length}/{eventTypeIdMaxLength} символов
            </span>
          </label>
          <label>
            Название
            <input
              value={form.title}
              maxLength={eventTypeTitleMaxLength}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <span className="field-hint">
              {form.title.length}/{eventTypeTitleMaxLength} символов
            </span>
          </label>
          <label>
            Описание
            <textarea
              value={form.description}
              maxLength={eventTypeDescriptionMaxLength}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={4}
            />
            <span className="field-hint">
              {form.description.length}/{eventTypeDescriptionMaxLength} символов
            </span>
          </label>
          <label>
            Длительность, минут
            <input
              type="number"
              min="1"
              max={eventTypeDurationMaxMinutes}
              value={form.durationMinutes}
              onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })}
            />
          </label>
          <div className="inline-actions">
            <button className="primary" disabled={submitting}>
              {submitting ? 'Сохраняем...' : 'Сохранить'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}>
                Отменить
              </button>
            )}
          </div>
        </form>
        <NoticeMessage notice={notice} />
      </div>
    </section>
  );
}

function AdminAvailabilityPage() {
  const [state, setState] = useState<LoadState<AvailabilityRuleInput[]>>({ data: [], loading: true, error: null });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadRules();
  }, []);

  async function loadRules() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const rules = await api.admin.getAvailabilityRules();
      setState({ data: rules.map(stripRuleId), loading: false, error: null });
    } catch (error) {
      setState({ data: [], loading: false, error: toMessage(error) });
    }
  }

  function updateRule(index: number, patch: Partial<AvailabilityRuleInput>) {
    setState((current) => ({
      ...current,
      data: current.data.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)),
    }));
  }

  function addRule() {
    setState((current) => ({ ...current, data: [...current.data, { dayOfWeek: 1, startTime: '10:00', endTime: '18:00' }] }));
  }

  function removeRule(index: number) {
    setState((current) => ({ ...current, data: current.data.filter((_, ruleIndex) => ruleIndex !== index) }));
  }

  function useDefaultRules() {
    setState((current) => ({ ...current, data: defaultRules }));
  }

  function validateRules() {
    if (state.data.length === 0) {
      return 'Добавьте хотя бы одно правило рабочего времени.';
    }

    for (const rule of state.data) {
      if (rule.startTime >= rule.endTime) {
        return `${dayNames[rule.dayOfWeek]}: время начала должно быть раньше времени окончания.`;
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);

    const validationError = validateRules();
    if (validationError) {
      setNotice({ type: 'error', message: validationError });
      return;
    }

    setSaving(true);
    try {
      const rules = await api.admin.updateAvailabilityRules(state.data);
      setState({ data: rules.map(stripRuleId), loading: false, error: null });
      setNotice({ type: 'success', message: 'Рабочее время сохранено.' });
    } catch (error) {
      setNotice({ type: 'error', message: toMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h2>Рабочее время</h2>
          <p className="muted">Правила полностью заменяются при сохранении.</p>
        </div>
        <div className="inline-actions">
          <button onClick={useDefaultRules}>Пн-Пт 10:00-18:00</button>
          <button onClick={addRule}>Добавить правило</button>
        </div>
      </div>
      <AsyncState loading={state.loading} error={state.error} onRetry={loadRules} />
      <form className="form" onSubmit={handleSubmit}>
        <div className="rules">
          {state.data.map((rule, index) => (
            <div className="rule-row" key={`${rule.dayOfWeek}-${index}`}>
              <label>
                День
                <select value={rule.dayOfWeek} onChange={(event) => updateRule(index, { dayOfWeek: Number(event.target.value) })}>
                  {Object.entries(dayNames).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Начало
                <input type="time" value={rule.startTime} onChange={(event) => updateRule(index, { startTime: event.target.value })} />
              </label>
              <label>
                Конец
                <input type="time" value={rule.endTime} onChange={(event) => updateRule(index, { endTime: event.target.value })} />
              </label>
              <button type="button" className="danger" onClick={() => removeRule(index)}>
                Удалить
              </button>
            </div>
          ))}
        </div>
        <button className="primary" disabled={saving}>
          {saving ? 'Сохраняем...' : 'Сохранить рабочее время'}
        </button>
      </form>
      <NoticeMessage notice={notice} />
    </section>
  );
}

function stripRuleId(rule: AvailabilityRule): AvailabilityRuleInput {
  return {
    dayOfWeek: rule.dayOfWeek,
    startTime: rule.startTime,
    endTime: rule.endTime,
  };
}

function AdminBookingsPage() {
  const [state, setState] = useState<LoadState<Booking[]>>({ data: [], loading: true, error: null });

  useEffect(() => {
    void loadBookings();
  }, []);

  async function loadBookings() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ data: await api.admin.getUpcomingBookings(), loading: false, error: null });
    } catch (error) {
      setState({ data: [], loading: false, error: toMessage(error) });
    }
  }

  const sortedBookings = useMemo(
    () => [...state.data].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt)),
    [state.data],
  );

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Предстоящие бронирования</h2>
        <button onClick={loadBookings}>Обновить</button>
      </div>
      <AsyncState loading={state.loading} error={state.error} onRetry={loadBookings} />
      <div className="table">
        {sortedBookings.map((booking) => (
          <div className="table-row" key={booking.id}>
            <span>
              <strong>{booking.eventTypeTitle}</strong>
              <small>{booking.eventTypeId}</small>
            </span>
            <span>{formatDateTime(booking.startsAt)}</span>
            <span>{formatDateTime(booking.endsAt)}</span>
            <span>
              <strong>{booking.guestName}</strong>
              <small>{booking.guestEmail}</small>
            </span>
          </div>
        ))}
      </div>
      {!state.loading && !state.error && sortedBookings.length === 0 && <p className="muted">Предстоящих бронирований пока нет.</p>}
    </section>
  );
}

function AsyncState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) {
    return <p className="status">Загрузка...</p>;
  }

  if (error) {
    return (
      <div className="notice error">
        <span>{error}</span>
        <button onClick={onRetry}>Повторить</button>
      </div>
    );
  }

  return null;
}

function NoticeMessage({ notice }: { notice: Notice | null }) {
  if (!notice) {
    return null;
  }

  return <div className={`notice ${notice.type}`}>{notice.message}</div>;
}

export default App;
