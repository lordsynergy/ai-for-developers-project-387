### Hexlet tests and linter status:
[![Actions Status](https://github.com/lordsynergy/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/lordsynergy/ai-for-developers-project-386/actions)

## Calendar Booking

Упрощённый аналог Cal.com — сервис для бронирования времени на встречу.

## Docker

Сборка Docker-образа:

```bash
docker build -t calendar-booking .
```

Запуск контейнера:

```bash
docker run --rm -e PORT=3000 -p 3000:3000 calendar-booking
```

Приложение будет доступно по адресу: http://localhost:3000

Порт можно изменить через переменную окружения `PORT`:

```bash
docker run --rm -e PORT=4567 -p 4567:4567 calendar-booking
```

SQLite-база в production хранится в `/app/storage`. Если нужно сохранить данные
между перезапусками контейнера, подключите volume:

```bash
docker volume create calendar-booking-storage
docker run --rm \
  -e PORT=3000 \
  -p 3000:3000 \
  -v calendar-booking-storage:/app/storage \
  calendar-booking
```

### Переменные окружения

| Переменная | Описание | По умолчанию |
|---|---|---|
| `PORT` | Порт сервера | `3000` |
| `RAILS_ENV` | Окружение Rails | `production` |
| `SECRET_KEY_BASE` | Секретный ключ Rails. Если не задан, контейнер генерирует временный ключ при старте | авто |
| `FORCE_SSL` | Принудительный HTTPS | `false` |

## Деплой

Публичная версия приложения: TODO

## Разработка

Инструкции по локальной разработке — в поддиректориях `backend/`, `frontend/` и `e2e/`.
