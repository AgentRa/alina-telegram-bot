# 🚀 Деплой на Render.com - Пошаговая инструкция

## 📋 Подготовка к деплою

### ✅ Что уже готово:
- ✅ Бот работает локально
- ✅ Код загружен на GitHub
- ✅ Все зависимости установлены

## 🔧 Настройка переменных окружения на Render.com

### Шаг 1: Создание сервиса на Render

1. **Перейдите на [render.com](https://render.com)**
2. **Войдите через GitHub**
3. **Нажмите "New +" → "Web Service"**
4. **Выберите ваш репозиторий:** `alina-telegram-bot`

### Шаг 2: Настройка сервиса

**Основные настройки:**
- **Name:** `polish-teacher-bot`
- **Region:** `Frankfurt (EU Central)`
- **Branch:** `main`
- **Root Directory:** оставить пустым
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Шаг 3: Переменные окружения

В разделе **Environment Variables** добавьте все переменные:

#### 🔑 ОБЯЗАТЕЛЬНЫЕ переменные:

| Переменная | Значение | Описание |
|------------|----------|----------|
| `BOT_TOKEN` | `7769373001:AAHwJ_IL-KEsVOldAKwc2ZMCz9Zu7ZyZwfM` | Токен Telegram бота |
| `PORT` | `3000` | Порт для render.com |

#### ⚙️ НАСТРОЙКИ РАСПИСАНИЯ:

| Переменная | Значение | Описание |
|------------|----------|----------|
| `TEACHER_WORKING_HOURS_START` | `9` | Начало рабочего дня (часы) |
| `TEACHER_WORKING_HOURS_END` | `20` | Конец рабочего дня (часы) |
| `LESSON_DURATION_MINUTES` | `60` | Длительность урока (минуты) |
| `BREAK_BETWEEN_LESSONS_MINUTES` | `30` | Перерыв между уроками (минуты) |
| `TEACHER_TIMEZONE` | `Europe/Warsaw` | Часовой пояс |

#### 📅 НАСТРОЙКИ БРОНИРОВАНИЯ:

| Переменная | Значение | Описание |
|------------|----------|----------|
| `ADVANCE_BOOKING_HOURS` | `24` | За сколько часов можно бронировать |
| `MAX_BOOKING_DAYS_AHEAD` | `14` | На сколько дней вперед показывать |
| `WORKING_DAYS` | `1,2,3,4,5,6` | Рабочие дни (1=Пн...6=Сб) |

#### 📆 GOOGLE CALENDAR (опционально):

| Переменная | Значение | Описание |
|------------|----------|----------|
| `GOOGLE_CREDENTIALS` | `{"type":"service_account"...}` | JSON credentials в одну строку |
| `CALENDAR_ID` | `anna.kowalska@gmail.com` | ID календаря или `primary` |

### Шаг 4: Копирование переменных

**Скопируйте и вставьте эти переменные в Render:**

```bash
# ОБЯЗАТЕЛЬНЫЕ
BOT_TOKEN=7769373001:AAHwJ_IL-KEsVOldAKwc2ZMCz9Zu7ZyZwfM
PORT=3000

# РАСПИСАНИЕ
TEACHER_WORKING_HOURS_START=9
TEACHER_WORKING_HOURS_END=20
LESSON_DURATION_MINUTES=60
BREAK_BETWEEN_LESSONS_MINUTES=30
TEACHER_TIMEZONE=Europe/Warsaw

# БРОНИРОВАНИЕ
ADVANCE_BOOKING_HOURS=24
MAX_BOOKING_DAYS_AHEAD=14
WORKING_DAYS=1,2,3,4,5,6

# GOOGLE CALENDAR (добавить позже если нужно)
GOOGLE_CREDENTIALS=
CALENDAR_ID=primary
```

## 🚀 Процесс деплоя

### 1. Нажмите "Create Web Service"
### 2. Render автоматически:
- Скачает код из GitHub
- Установит зависимости (`npm install`)
- Запустит бота (`npm start`)

### 3. Дождитесь завершения деплоя
В логах должно появиться:
```
🇵🇱 Polish Teacher Bot (Calendar Integration) запущен...
📅 Google Calendar интеграция: Недоступна (локальный режим)
🕐 Рабочие часы: 9:00-20:00
```

## ✅ Проверка работы

### 1. Проверьте статус в Render
- Статус должен быть **"Live"**
- В логах не должно быть ошибок

### 2. Протестируйте бота в Telegram
- Отправьте `/start`
- Проверьте "Umów lekcję"
- Убедитесь, что показываются слоты

### 3. Отладка (если нужно)
- Отправьте `/debug` боту
- Проверьте логи в панели Render

## 🔧 Настройка Google Calendar (опционально)

### Если хотите добавить календарь позже:

1. **Следуйте инструкции** в `GOOGLE_CALENDAR_TEACHER_INTEGRATION.md`
2. **Получите JSON credentials**
3. **Конвертируйте в одну строку** (без переносов!)
4. **Добавьте в Environment Variables:**
   - `GOOGLE_CREDENTIALS`: весь JSON
   - `CALENDAR_ID`: ваш email календаря

### Конвертация JSON в строку:
```bash
# Вариант 1: онлайн
https://www.cleancss.com/json-minify/

# Вариант 2: вручную
# Удалите все переносы строк и лишние пробелы
```

## 📊 Мониторинг

### В панели Render можете:
- 📈 **Смотреть логи** - Real-time logs
- 📊 **Мониторить нагрузку** - Metrics
- ⚙️ **Обновлять переменные** - Environment
- 🔄 **Перезапускать сервис** - Manual Deploy

### Полезные команды для отладки:
```bash
# В Telegram отправьте боту:
/start   # Проверка основных функций
/debug   # Диагностическая информация
```

## 🎯 Настройки для разных сценариев

### Сценарий 1: Только будние дни
```bash
TEACHER_WORKING_HOURS_START=9
TEACHER_WORKING_HOURS_END=17
WORKING_DAYS=1,2,3,4,5
```

### Сценарий 2: Гибкий график 7 дней
```bash
TEACHER_WORKING_HOURS_START=8
TEACHER_WORKING_HOURS_END=22
WORKING_DAYS=0,1,2,3,4,5,6
```

### Сценарий 3: Длинные уроки с большими перерывами
```bash
LESSON_DURATION_MINUTES=90
BREAK_BETWEEN_LESSONS_MINUTES=60
```

## ⚠️ Troubleshooting

### Проблема: Сервис не запускается
**Решение:**
1. Проверьте логи в Render
2. Убедитесь, что все переменные добавлены
3. Проверьте правильность BOT_TOKEN

### Проблема: "Google Calendar не работает"
**Решение:**
1. Проверьте формат GOOGLE_CREDENTIALS (должен быть в одну строку)
2. Убедитесь, что календарь предоставлен Service Account
3. Бот работает и без календаря в fallback режиме

### Проблема: "Термины недоступны"
**Решение:**
✅ Эта проблема уже решена в новой версии!

## 🎉 Готово!

После успешного деплоя:
- ✅ Бот работает 24/7 на render.com
- ✅ Автоматические обновления из GitHub
- ✅ Профессиональная система записи
- ✅ Мониторинг и логи

**🚀 Ваш бот готов к работе с реальными студентами!**
