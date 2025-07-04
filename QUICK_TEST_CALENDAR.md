# 🚀 Быстрый тест календарной версии

## ⚡ Тестирование БЕЗ настройки Google Calendar

Новая версия работает в двух режимах:
1. **С Google Calendar** - полная интеграция ✅
2. **Fallback режим** - улучшенное локальное расписание ⚠️

### Запуск в fallback режиме (для тестирования):

```bash
npm start
```

**Ожидаемый вывод:**
```
⚠️ Google Calendar не настроен - используется локальное расписание
🇵🇱 Polish Teacher Bot (Calendar Edition) запущен...
📅 Google Calendar интеграция: Недоступна (локальный режим) ⚠️
```

### 🎯 Что тестировать:

1. **Отправьте боту `/start`**
2. **Нажмите "Umów lekcję"**
3. **Выберите любой тип урока**
4. **Увидите**: "🔄 Sprawdzam dostępne terminy w kalendarzu..."
5. **Результат**: Больше доступных слотов, лучшее форматирование дат

### 🆕 Новые возможности (даже без календаря):

✅ **Запрос имени студента** - более персонализированный подход
✅ **Улучшенная валидация** - проверка имени, email, телефона
✅ **Лучшие сообщения** - более детальная информация
✅ **Умное время** - показ слотов на неделю вперед
✅ **Индикаторы прогресса** - "Sprawdzam terminy...", "Rezerwuję..."

---

## 📅 Для полной интеграции с календарем:

### Шаг 1: Следуйте инструкции
```
GOOGLE_CALENDAR_STEP_BY_STEP.md
```

### Шаг 2: Обновите .env
```bash
GOOGLE_CREDENTIALS={"type":"service_account",...}
CALENDAR_ID=primary
WORK_START_HOUR=9
WORK_END_HOUR=20
```

### Шаг 3: Перезапустите бота
```bash
npm start
```

### Ожидаемый результат с календарем:
```
✅ Google Calendar API инициализирован
📅 Календарь: primary
🕐 Рабочие часы: 9:00 - 20:00
📋 Рабочие дни: Пн, Вт, Ср, Чт, Пт, Сб
🇵🇱 Polish Teacher Bot (Calendar Edition) запущен...
📅 Google Calendar интеграция: Активна ✅
```

---

## 🔍 Как работает интеграция с календарем:

### 📊 Анализ расписания:
1. **Читает ваш Google Calendar** на 2 недели вперед
2. **Находит все существующие события** (встречи, уроки, личные дела)
3. **Определяет свободные промежутки** в рабочие часы
4. **Учитывает длительность урока + перерыв** (60+30 мин по умолчанию)
5. **Показывает только реально доступное время**

### 📅 При бронировании:
1. **Создает событие в календаре** с деталями урока
2. **Добавляет студента как участника** (email уведомления)
3. **Настраивает напоминания** (за 24ч, 1ч, 15мин)
4. **Цветовая кодировка** по типам уроков
5. **Защита от двойного бронирования**

### 🎨 Цвета событий в календаре:
- 🟢 **Początkujący** - зеленый
- 🟡 **Średniozaawansowany** - желтый  
- 🔴 **Zaawansowany** - красный
- 💬 **Konwersacje** - синий
- 💼 **Biznesowy** - фиолетовый
- 📝 **Egzaminy** - оранжевый

---

## ⚙️ Настройка рабочего времени:

```bash
# .env файл
WORK_START_HOUR=9     # Начало рабочего дня
WORK_END_HOUR=20      # Конец рабочего дня
WORK_DAYS=1,2,3,4,5,6 # Пн-Сб (0=Вс, 1=Пн, ...)
LESSON_DURATION=60    # Длительность урока (мин)
BREAK_DURATION=30     # Перерыв между уроками (мин)
```

**Пример нестандартного расписания:**
```bash
WORK_START_HOUR=10    # С 10 утра
WORK_END_HOUR=18      # До 6 вечера
WORK_DAYS=1,2,3,4,5   # Только Пн-Пт
LESSON_DURATION=90    # Уроки по 90 мин
BREAK_DURATION=15     # Короткий перерыв
```

---

## 🎯 Результат интеграции:

### ✅ Для учителя:
- **Автоматическое управление расписанием**
- **Синхронизация с личным календарем**
- **Защита от конфликтов времени**
- **Автоматические уведомления**
- **Цветовая организация уроков**

### ✅ Для студентов:
- **Только реально доступное время**
- **Подтверждения на email**
- **Напоминания перед уроком**
- **Персонализированный сервис**
- **Прозрачная информация о расписании**

---

**🚀 Протестируйте прямо сейчас: `npm start`**
