# 📅 Пошаговая настройка Google Calendar для учителя

## 🎯 Цель: Синхронизация с реальным календарем учителя

Бот будет:
✅ Читать ваш реальный Google Calendar
✅ Находить свободные слоты в рабочие часы
✅ Предлагать только доступное время ученикам
✅ Автоматически создавать события при бронировании

---

## Шаг 1: Создание проекта в Google Cloud Console

### 1.1 Переход в консоль
1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Войдите под аккаунтом, который связан с вашим календарем учителя

### 1.2 Создание проекта
1. Вверху слева нажмите на селектор проектов
2. Нажмите "NEW PROJECT" (Новый проект)
3. Заполните:
   - **Project name**: `Polish Teacher Bot`
   - **Organization**: оставьте по умолчанию
4. Нажмите "CREATE"

---

## Шаг 2: Включение Calendar API

### 2.1 Активация API
1. В меню слева: **APIs & Services** → **Library**
2. В поиске введите: `Google Calendar API`
3. Нажмите на результат "Google Calendar API"
4. Нажмите **ENABLE** (Включить)

### 2.2 Проверка активации
После включения вы увидите дашборд API с графиками использования.

---

## Шаг 3: Создание Service Account

### 3.1 Переход к Credentials
1. **APIs & Services** → **Credentials**
2. Нажмите **+ CREATE CREDENTIALS**
3. Выберите **Service Account**

### 3.2 Настройка Service Account
**Шаг 1 - Service account details:**
- **Service account name**: `teacher-calendar-bot`
- **Service account ID**: `teacher-calendar-bot` (заполнится автоматически)
- **Description**: `Service account for reading teacher calendar`
- Нажмите **CREATE AND CONTINUE**

**Шаг 2 - Grant access (опционально):**
- Можно пропустить, нажмите **CONTINUE**

**Шаг 3 - Grant users access (опционально):**
- Можно пропустить, нажмите **DONE**

---

## Шаг 4: Создание ключа доступа

### 4.1 Создание JSON ключа
1. В списке Service Accounts найдите `teacher-calendar-bot`
2. Нажмите на email Service Account
3. Перейдите в раздел **KEYS**
4. Нажмите **ADD KEY** → **Create new key**
5. Выберите **JSON** и нажмите **CREATE**
6. Файл автоматически скачается как `polish-teacher-bot-xxxxx.json`

### 4.2 Важно запомнить!
📧 **Email Service Account** (будет нужен на следующем шаге):
Формат: `teacher-calendar-bot@polish-teacher-bot-xxxxx.iam.gserviceaccount.com`

---

## Шаг 5: Предоставление доступа к календарю

### 5.1 Открытие настроек календаря
1. Откройте [Google Calendar](https://calendar.google.com/)
2. В левой панели найдите календарь учителя (обычно ваш основной календарь)
3. Нажмите на три точки рядом с названием календаря
4. Выберите **Settings and sharing** (Настройки и общий доступ)

### 5.2 Добавление Service Account
1. Прокрутите до раздела **Share with specific people**
2. Нажмите **+ Add people**
3. Введите email Service Account (из шага 4.2)
4. В выпадающем меню выберите **Make changes to events** (Внесение изменений)
5. Нажмите **Send** (Отправить)

### 5.3 Получение Calendar ID
1. В той же настройке найдите раздел **Calendar ID**
2. Скопируйте **Calendar ID** (выглядит как email или "primary")

---

## Шаг 6: Подготовка credentials.json

### 6.1 Минификация JSON
Скачанный файл нужно преобразовать в одну строку для .env файла.

**Способ 1: Онлайн**
1. Откройте [JSON Minifier](https://www.cleancss.com/json-minify/)
2. Скопируйте весь контент файла `polish-teacher-bot-xxxxx.json`
3. Вставьте в минификатор и нажмите "Minify JSON"
4. Скопируйте результат

**Способ 2: В командной строке**
```bash
# Замените 'your-file.json' на имя вашего файла
node -e "console.log(JSON.stringify(require('./polish-teacher-bot-xxxxx.json')))"
```

---

## Шаг 7: Обновление .env файла

Откройте `.env` и обновите:

```bash
# Telegram Bot
BOT_TOKEN=7769373001:AAHwJ_IL-KEsVOldAKwc2ZMCz9Zu7ZyZwfM

# Google Calendar настройки
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"polish-teacher-bot-xxxxx","private_key_id":"xxxxx",...}
CALENDAR_ID=primary

# Рабочие часы учителя (24-часовой формат)
WORK_START_HOUR=9
WORK_END_HOUR=20
WORK_DAYS=1,2,3,4,5,6

# Длительность урока (минуты)
LESSON_DURATION=60
BREAK_DURATION=30

# Часовой пояс
TIMEZONE=Europe/Warsaw
```

---

## Шаг 8: Тестирование

### 8.1 Запуск бота
```bash
npm start
```

### 8.2 Ожидаемый результат
```
✅ Google Calendar API инициализирован
🇵🇱 Polish Teacher Bot (улучшенная версия) запущен...
📅 Google Calendar интеграция: Активна
```

### 8.3 Проверка в Telegram
1. Отправьте боту `/start`
2. Нажмите "Umów lekcję"
3. Выберите тип урока
4. **Важно**: бот должен показать "🔄 Sprawdzam dostępne terminy..."
5. Должны появиться реальные свободные слоты из вашего календаря

---

## 🔧 Troubleshooting

### ❌ "Google Calendar API не инициализирован"
- Проверьте формат GOOGLE_CREDENTIALS (должна быть одна строка без переносов)
- Убедитесь, что API включен в Google Cloud Console

### ❌ "Calendar not found" 
- Проверьте правильность CALENDAR_ID
- Попробуйте использовать "primary" вместо email календаря

### ❌ "Insufficient permissions"
- Убедитесь, что Service Account добавлен в календарь
- Проверьте права доступа ("Make changes to events")

### ❌ Показывает "термины недоступны"
- Проверьте настройки рабочих часов в .env
- Убедитесь, что в календаре есть свободное время
- Проверьте часовой пояс

---

## 🎯 Результат

После настройки:
1. **Бот читает ваш реальный календарь**
2. **Находит свободные слоты в рабочие часы**
3. **Ученики видят только доступное время**
4. **При бронировании создается событие в календаре**
5. **Автоматические напоминания ученикам**

---

**Готово!** Полная интеграция с реальным календарем учителя! 🎉
