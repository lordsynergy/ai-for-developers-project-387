# План разработки

## Контекст проекта

Это приложение для бронирования встреч, вдохновлённое Cal.com. Базовая функциональность уже реализована: владелец настраивает типы встреч (event types) и еженедельное рабочее время, гость просматривает публичные слоты на ближайшие 14 дней и бронирует подходящее время.

## Цель

Цель этого этапа — не писать крупную новую фичу, а встроить OpenCode в цикл разработки на GitHub: создание issue, анализ задачи, pull request, ревью, доработки, регулярные автоматические проверки.

## Запланированные задачи

### 1. [Bug] Отсутствие eventTypeId возвращает 404 вместо 400

**Проблема:**
`POST /api/public/bookings` без `eventTypeId` сейчас может обрабатываться как `not found`, потому что backend пытается найти тип встречи по отсутствующему slug. Отсутствие обязательного поля должно возвращать `400 Bad Request`.

**Критерии приёмки:**
- Добавить regression request spec.
- `POST /api/public/bookings` без `eventTypeId` возвращает `400 Bad Request`.
- Формат ответа соответствует другим API-ошибкам.
- Существующие specs проходят.

**Возможные файлы:** `backend/app/controllers/api/public/bookings_controller.rb`, `backend/app/services/bookings/creator.rb`, `backend/spec/requests/public_api_spec.rb`

**Labels:** backend, bug, tests

**Приоритет:** High

---

### 2. [Bug] Race condition при переключении типов встреч на публичной странице

**Проблема:**
При быстром переключении между типами встреч старый запрос слотов может завершиться позже нового и перезаписать текущее состояние `slots`.

**Критерии приёмки:**
- Предотвратить обновление UI устаревшими ответами.
- Использовать `AbortController` или явную защиту от stale-запросов.
- Добавить тест или задокументировать сценарий ручной проверки.
- Существующие frontend проверки проходят.

**Возможные файлы:** `frontend/src/App.tsx`, `frontend/src/api/client.ts`

**Labels:** frontend, bug, ux

**Приоритет:** Medium

---

### 3. [UX] Просроченный admin token оставляет frontend в авторизованном состоянии

**Проблема:**
Backend возвращает информацию об истечении токена, но frontend хранит только сам токен. После истечения срока UI может выглядеть авторизованным, а API-запросы падают с `401`.

**Критерии приёмки:**
- Хранить и проверять срок действия токена, или глобально обрабатывать `401`.
- Просроченные сессии перенаправляют пользователя на экран логина.
- Состояние админа очищается, когда сессия больше не валидна.
- Существующие frontend проверки проходят.

**Возможные файлы:** `frontend/src/api/client.ts`, `frontend/src/App.tsx`

**Labels:** frontend, ux, auth

**Приоритет:** Medium

---

### 4. [Tests] Добавить недостающие негативные request specs

**Проблема:**
В backend уже есть несколько негативных тестов, но некоторые важные случаи для public API всё ещё стоит покрыть.

**Сценарии для покрытия (если ещё не покрыто в задаче #1):**
- `POST /api/public/bookings` с невалидным `guestEmail`.
- `GET /api/public/event-types/:id/slots` для несуществующего типа встречи.
- Неавторизованный доступ к основным admin endpoint'ам (profile, availability-rules, bookings).

**Критерии приёмки:**
- Добавить focused request specs для недостающих негативных кейсов.
- Не дублировать существующие тесты.
- Существующие specs проходят.

**Возможные файлы:** `backend/spec/requests/public_api_spec.rb`, `backend/spec/requests/admin_api_spec.rb`

**Labels:** backend, tests

**Приоритет:** Medium

---

### 5. [CI] Аудит GitHub Actions workflows

**Проблема:**
В репозитории нужно использовать поддерживаемые версии GitHub Actions. Задача — проверить текущие версии и убедиться, что workflows полезны и не содержат неожиданного поведения. Не снижать версию без причины.

**Критерии приёмки:**
- Проверить текущие версии `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`.
- Обновить только неподдерживаемые или устаревшие actions.
- Сохранить полезные проверки, включая `frontend build`.
- Workflow проходит на pull requests.

**Возможные файлы:** `.github/workflows/e2e.yml`, `.github/workflows/opencode-*.yml`, `.github/workflows/hexlet-check.yml`

**Labels:** ci, github-actions

**Приоритет:** Medium

---

### 6. [Automation] Добавить scheduled Lighthouse workflow

**Проблема:**
Проекту нужен scheduled workflow, демонстрирующий регулярные автоматические проверки.

**Критерии приёмки:**
- Добавить GitHub Actions workflow с триггерами `schedule` и `workflow_dispatch`.
- Поднять приложение или frontend preview server перед запуском Lighthouse.
- Запустить Lighthouse проверку для frontend.
- Загрузить Lighthouse отчёт как artifact workflow.
- Задокументировать, как найти отчёт в GitHub Actions.

**Возможные файлы:** Создать `.github/workflows/nightly.yml`, добавить `lighthouserc.json` в `frontend/`

**Labels:** ci, automation, lighthouse

**Приоритет:** High

---

## Рекомендуемый первый issue для OpenCode

Начать с:

**[Bug] Отсутствие eventTypeId возвращает 404 вместо 400**

Это небольшая backend-задача с чёткими критериями приёмки, подходящая для первого полного цикла: issue → triage → pull request → ревью → доработки.