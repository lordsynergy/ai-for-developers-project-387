export type EventType = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
};

export type Slot = {
  eventTypeId: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
};

export type Booking = {
  id: string;
  eventTypeId: string;
  eventTypeTitle: string;
  guestName: string;
  guestEmail: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type AvailabilityRule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AdminSession = {
  token: string;
  expiresAt: string;
};

export type CreateBookingRequest = {
  eventTypeId: string;
  startAt: string;
  guestName: string;
  guestEmail: string;
};

export type EventTypeCreateRequest = EventType;

export type EventTypeUpdateRequest = Partial<Pick<EventType, 'title' | 'description' | 'durationMinutes'>>;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const tokenKey = 'calendar_booking_admin_token';

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token: string) {
  localStorage.setItem(tokenKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

async function request<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth) {
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw new NetworkError(error instanceof Error ? error.message : undefined);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    const message = data?.message ?? fallbackErrorMessage(response.status);
    throw new ApiError(response.status, message, data?.error);
  }

  return data as T;
}

function jsonBody(body: unknown) {
  return JSON.stringify(body);
}

function fallbackErrorMessage(status: number) {
  switch (status) {
    case 400:
      return 'Некорректный запрос. Проверьте введённые данные.';
    case 401:
      return 'Нужен вход в админку или текущая сессия истекла.';
    case 404:
      return 'Запрошенные данные не найдены.';
    case 409:
      return 'Выбранный слот уже занят.';
    case 422:
      return 'Данные нарушают правила бронирования.';
    default:
      return 'API вернул ошибку. Попробуйте ещё раз.';
  }
}

export function getStoredAdminToken() {
  return getToken();
}

export const api = {
  public: {
    listEventTypes: () => request<EventType[]>('/api/public/event-types'),
    getSlots: (eventTypeId: string) =>
      request<Slot[]>(`/api/public/event-types/${encodeURIComponent(eventTypeId)}/slots`),
    createBooking: (body: CreateBookingRequest) =>
      request<Booking>('/api/public/bookings', {
        method: 'POST',
        body: jsonBody(body),
      }),
  },
  admin: {
    login: async (body: LoginRequest) => {
      const session = await request<AdminSession>('/api/admin/sessions', {
        method: 'POST',
        body: jsonBody(body),
      });
      setToken(session.token);
      return session;
    },
    logout: async () => {
      try {
        await request<void>('/api/admin/sessions', { method: 'DELETE', auth: true });
      } finally {
        clearToken();
      }
    },
    listEventTypes: () => request<EventType[]>('/api/admin/event-types', { auth: true }),
    createEventType: (body: EventTypeCreateRequest) =>
      request<EventType>('/api/admin/event-types', {
        method: 'POST',
        body: jsonBody(body),
        auth: true,
      }),
    updateEventType: (eventTypeId: string, body: EventTypeUpdateRequest) =>
      request<EventType>(`/api/admin/event-types/${encodeURIComponent(eventTypeId)}`, {
        method: 'PATCH',
        body: jsonBody(body),
        auth: true,
      }),
    deleteEventType: (eventTypeId: string) =>
      request<void>(`/api/admin/event-types/${encodeURIComponent(eventTypeId)}`, {
        method: 'DELETE',
        auth: true,
      }),
    getAvailabilityRules: () => request<AvailabilityRule[]>('/api/admin/availability-rules', { auth: true }),
    updateAvailabilityRules: (rules: AvailabilityRuleInput[]) =>
      request<AvailabilityRule[]>('/api/admin/availability-rules', {
        method: 'PUT',
        body: jsonBody({ rules }),
        auth: true,
      }),
    getUpcomingBookings: () => request<Booking[]>('/api/admin/bookings/upcoming', { auth: true }),
  },
};
