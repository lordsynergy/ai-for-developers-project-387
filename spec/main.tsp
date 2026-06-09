import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;

@server("http://localhost:3000", "Local development server")
@service(#{
  title: "Calendar Booking API",
})
@info(#{
  title: "Calendar Booking API",
  version: "1.0.0",
})
namespace CalendarBooking;

// ============================================================
// Scalars
// ============================================================

@pattern("^([01]\\d|2[0-3]):([0-5]\\d)$")
scalar TimeString extends string;

@pattern("^[a-z0-9-]+$")
scalar Slug extends string;

@minValue(1)
@maxValue(7)
scalar DayOfWeek extends int32;

// ============================================================
// Models
// ============================================================

model Owner {
  id: string;
  name: string;
  timezone: string;
}

model EventType {
  id: Slug;
  @minLength(1)
  title: string;
  description: string;
  @minValue(1)
  durationMinutes: int32;
}

model EventTypeCreateRequest {
  id: Slug;
  @minLength(1)
  title: string;
  description: string;
  @minValue(1)
  durationMinutes: int32;
}

model EventTypeUpdateRequest {
  @minLength(1)
  title?: string;
  description?: string;
  @minValue(1)
  durationMinutes?: int32;
}

model AvailabilityRule {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
}

model AvailabilityRuleInput {
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
}

model UpdateAvailabilityRulesRequest {
  rules: AvailabilityRuleInput[];
}

model Slot {
  eventTypeId: Slug;
  startAt: offsetDateTime;
  endAt: offsetDateTime;
  durationMinutes: int32;
}

model Booking {
  id: string;
  eventTypeId: Slug;
  eventTypeTitle: string;
  guestName: string;
  guestEmail: string;
  startsAt: offsetDateTime;
  endsAt: offsetDateTime;
  createdAt: offsetDateTime;
}

model CreateBookingRequest {
  eventTypeId: Slug;
  startAt: offsetDateTime;
  @minLength(1)
  guestName: string;
  @format("email")
  guestEmail: string;
}

model AdminSession {
  token: string;
  expiresAt: offsetDateTime;
}

model LoginRequest {
  @format("email")
  email: string;
  @minLength(1)
  password: string;
}

// ============================================================
// Error Models
// ============================================================

model ErrorBody {
  error: string;
  message: string;
}

@error
model BadRequestError extends ErrorBody {
  @statusCode statusCode: 400;
  error: "BAD_REQUEST";
}

@error
model UnauthorizedError extends ErrorBody {
  @statusCode statusCode: 401;
  error: "UNAUTHORIZED";
}

@error
model NotFoundError extends ErrorBody {
  @statusCode statusCode: 404;
  error: "NOT_FOUND";
}

@error
model ConflictError extends ErrorBody {
  @statusCode statusCode: 409;
  error: "CONFLICT";
}

@error
model ValidationError extends ErrorBody {
  @statusCode statusCode: 422;
  error: "VALIDATION_ERROR";
}

// ============================================================
// Response Wrappers for Non-Default Status Codes
// ============================================================

model ResourceCreatedResponse<T> {
  @statusCode statusCode: 201;
  @body body: T;
}

// ============================================================
// Public API
// ============================================================

namespace PublicApi {
  @route("/api/public/event-types")
  @get
  op listEventTypes(): EventType[] | BadRequestError;

  /**
   * Получить свободные слоты для выбранного типа встречи.
   *
   * Бизнес-правила:
   * - Слоты формируются сервером на ближайшие 14 дней от текущей даты сервера.
   * - Слоты строятся с учётом timezone владельца.
   * - Слоты строятся с учётом рабочего времени владельца.
   * - Слот должен соответствовать durationMinutes выбранного типа встречи.
   * - Конфликт занятости действует между всеми типами встреч.
   */
  @route("/api/public/event-types/{eventTypeId}/slots")
  @get
  op getSlots(
    @path eventTypeId: Slug,
  ): Slot[] | NotFoundError | BadRequestError;

  /**
   * Создать бронирование.
   *
   * Бизнес-правила:
   * - Бронирование нельзя создать вне рабочего времени.
   * - Бронирование нельзя создать вне окна 14 дней.
   * - Бронирование нельзя создать, если оно пересекается с существующим бронированием.
   * - Конфликт занятости действует между всеми типами встреч.
   * - Занятый слот возвращает 409 Conflict.
   * - Нарушение бизнес-правил возвращает 422 Validation Error.
   */
  @route("/api/public/bookings")
  @post
  op createBooking(
    @body body: CreateBookingRequest,
  ): ResourceCreatedResponse<Booking> | ConflictError | ValidationError | NotFoundError | BadRequestError;
}

// ============================================================
// Admin API
// ============================================================

namespace AdminApi {
  /**
   * Войти в административную часть.
   * Не требует предварительной аутентификации.
   *
   * При успешном входе возвращает token для последующих запросов.
   * Token передаётся в заголовке Authorization: Bearer <token>.
   */
  @route("/api/admin/sessions")
  @post
  op login(
    @body body: LoginRequest,
  ): AdminSession | UnauthorizedError | BadRequestError;

  /**
   * Завершить админскую сессию (logout).
   * Требует валидный Bearer token.
   */
  @route("/api/admin/sessions")
  @delete
  @useAuth(BearerAuth)
  op logout(): void | UnauthorizedError;

  /**
   * Получить профиль владельца календаря.
   * Требует валидный Bearer token.
   */
  @route("/api/admin/profile")
  @get
  @useAuth(BearerAuth)
  op getProfile(): Owner | UnauthorizedError | NotFoundError;

  /**
   * Получить список типов встреч (админ-версия).
   * Требует валидный Bearer token.
   */
  @route("/api/admin/event-types")
  @get
  @useAuth(BearerAuth)
  op listAdminEventTypes(): EventType[] | UnauthorizedError;

  /**
   * Создать новый тип встречи.
   * Требует валидный Bearer token.
   *
   * Если event type с таким id уже существует — 409 Conflict.
   */
  @route("/api/admin/event-types")
  @post
  @useAuth(BearerAuth)
  op createEventType(
    @body body: EventTypeCreateRequest,
  ): ResourceCreatedResponse<EventType> | ConflictError | UnauthorizedError | ValidationError | BadRequestError;

  /**
   * Обновить существующий тип встречи.
   * Требует валидный Bearer token.
   * Все поля опциональны — обновляются только переданные.
   */
  @route("/api/admin/event-types/{eventTypeId}")
  @patch
  @useAuth(BearerAuth)
  op updateEventType(
    @path eventTypeId: Slug,
    @body body: EventTypeUpdateRequest,
  ): EventType | UnauthorizedError | NotFoundError | ValidationError | BadRequestError;

  /**
   * Удалить тип встречи.
   * Требует валидный Bearer token.
   */
  @route("/api/admin/event-types/{eventTypeId}")
  @delete
  @useAuth(BearerAuth)
  op deleteEventType(
    @path eventTypeId: Slug,
  ): void | UnauthorizedError | NotFoundError | BadRequestError;

  /**
   * Получить правила рабочего времени владельца.
   * Требует валидный Bearer token.
   */
  @route("/api/admin/availability-rules")
  @get
  @useAuth(BearerAuth)
  op getAvailabilityRules(): AvailabilityRule[] | UnauthorizedError | NotFoundError;

  /**
   * Обновить правила рабочего времени владельца.
   * Требует валидный Bearer token.
   *
   * Заменяет все существующие правила новым набором.
   *
   * Бизнес-правила:
   * - Правило не может иметь startTime позже endTime.
   * - Правила не должны пересекаться для одного дня недели.
   * - При нарушении возвращается 422 Validation Error.
   */
  @route("/api/admin/availability-rules")
  @put
  @useAuth(BearerAuth)
  op updateAvailabilityRules(
    @body body: UpdateAvailabilityRulesRequest,
  ): AvailabilityRule[] | UnauthorizedError | ValidationError | BadRequestError;

  /**
   * Получить список предстоящих бронирований.
   * Требует валидный Bearer token.
   *
   * Возвращает будущие бронирования всех типов встреч,
   * отсортированные по startsAt по возрастанию.
   */
  @route("/api/admin/bookings/upcoming")
  @get
  @useAuth(BearerAuth)
  op getUpcomingBookings(): Booking[] | UnauthorizedError;
}
