# SubMonitor

Сервис мониторинга подписок с аналитикой расходов.

## Возможности

- Управление подписками, категориями и способами оплаты
- Автоматическое создание платежей по расписанию
- Отмена платежей
- Дашборд: общие траты, прогноз на месяц/год, график по категориям, ближайшие платежи
- История платежей с пагинацией и фильтрацией по подписке
- Статистика по каждой подписке
- Тёмная тема, адаптивная вёрстка (десктоп + мобильная навигация)

## Стек

- **Backend:** Python 3.12, FastAPI, SQLite, APScheduler
- **Frontend:** HTML, CSS, Vanilla JS, Font Awesome
- **Infra:** Docker, Nginx, Docker Compose

## Запуск

```bash
docker compose up --build -d
```

- Фронтенд: http://localhost:8080
- Бэкенд API: http://localhost:8000/docs
- Swagger: http://localhost:8000/docs

## Остановка

```bash
docker compose down        # остановить
docker compose down -v     # остановить + удалить БД
```