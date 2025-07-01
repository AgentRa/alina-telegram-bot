# 💻 Polish Teacher Bot - Комментарии к коду

## 🔧 Что можно легко изменить

### 📅 Расписание работы

В файле `polish-teacher-bot.js` найдите функцию `initializeSchedule()`:

```javascript
function initializeSchedule() {
    // 🗓 ДНИ НЕДЕЛИ - можно добавить/убрать дни
    const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    
    // ⏰ ВРЕМЕННЫЕ СЛОТЫ - можно изменить время работы
    const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'];
    
    // Каждый слот создается автоматически как доступный
}
```

**Пример изменения:**
```javascript
// Работать только в будни до 17:00
const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];
```

### 💰 Цены на уроки

Найдите объект `lessonTypes`:

```javascript
const lessonTypes = {
    'beginner': {
        name: '🟢 Początkujący (A1-A2)',
        description: 'Lekcje dla początkujących - podstawy języka polskiego',
        price: '60 zł',     // ← ЦЕНА
        duration: '60 min'  // ← ДЛИТЕЛЬНОСТЬ
    },
    // ... остальные типы
};
```

**Пример изменения цены:**
```javascript
price: '70 zł',  // Было 60, стало 70
```

### 📞 Контактная информация

В функции `showContact()` измените:

```javascript
📧 Email: anna.kowalska@email.com     // ← Ваш email
📱 WhatsApp: +48 123 456 789          // ← Ваш WhatsApp  
🌐 Website: www.polskionline.pl       // ← Ваш сайт
📍 Адрес: ul. Nowy Świat 15/3         // ← Ваш адрес
```

### 👩‍🏫 Информация о преподавателе

В функции `showInfo()` измените:

```javascript
👩‍🏫 **Anna Kowalska**               // ← Ваше имя
• 8 лет доświадczения в nauczaniu online  // ← Ваш опыт
• Образование: Филология, УВ            // ← Ваше образование
```

## 🎯 Логика работы бота

### 📊 Хранение данных

```javascript
// 👥 СЕССИИ ПОЛЬЗОВАТЕЛЕЙ (временные данные при записи)
let userSessions = {};

// 📅 РАСПИСАНИЕ ПРЕПОДАВАТЕЛЯ (свободные/занятые слоты)  
let teacherSchedule = {};

// 📝 ЗАВЕРШЕННЫЕ ЗАПИСИ (история всех уроков)
let bookings = {};
```

### 🔄 Процесс записи на урок

```javascript
// 1️⃣ Пользователь выбирает тип урока
callback_data: 'lesson_beginner'

// 2️⃣ Бот показывает доступные времена
getAvailableTimeSlots()

// 3️⃣ Пользователь выбирает время
callback_data: 'time_Środa_15:00'

// 4️⃣ Бот просит email
step: 'waiting_email'

// 5️⃣ Бот просит телефон  
step: 'waiting_phone'

// 6️⃣ Показывает подтверждение
step: 'confirmation'

// 7️⃣ Сохраняет бронирование
confirmBooking()
```

### ⏰ Умное расписание

```javascript
function getAvailableTimeSlots() {
    const now = new Date();
    const currentHour = now.getHours();
    
    // 🚫 Не показывать слоты раньше чем через 2 часа
    const minHour = currentHour + 2;
    
    // ✅ Показать только доступные слоты после текущего времени
    if (slot.available && slotHour >= minHour) {
        slots.push({...});
    }
}
```

## 🛠 Как добавить новые функции

### ➕ Добавить новый тип урока

```javascript
// В объект lessonTypes добавить:
'intensive': {
    name: '🔥 Intensywny kurs',
    description: 'Intensywne lekcje 2x w tygodniu',
    price: '120 zł',
    duration: '90 min'
}
```

### ➕ Добавить новую команду

```javascript
// Новая команда /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Список всех команд...');
});
```

### ➕ Добавить уведомления

```javascript
// После подтверждения записи
function confirmBooking(chatId, messageId, userId) {
    // ... существующий код ...
    
    // 📧 НОВОЕ: отправить email преподавателю
    sendEmailToTeacher({
        student: session.email,
        lesson: selectedLesson.name,
        time: `${day} ${time}`
    });
}
```

## 🔍 Отладка и логирование

### 📊 Что логируется автоматически

```javascript
console.log('🇵🇱 Polski Teacher Bot запущен...');
console.log('Новая запись:', session.email, selectedLesson.name);
console.log('Ошибка:', error.message);
```

### 🔧 Добавить больше логов

```javascript
// В любом месте кода добавить:
console.log('DEBUG: Пользователь выбрал тип урока:', lessonType);
console.log('DEBUG: Доступных слотов:', availableSlots.length);
```

### 📈 Посмотреть логи в Render

1. **Render Dashboard** → ваш сервис
2. **Logs** → выберите временной диапазон
3. **Поиск** по ключевым словам

## ⚠️ Важные ограничения

### 💾 Данные в памяти

```javascript
// ❌ ПРОБЛЕМА: при перезапуске все данные теряются
let userSessions = {};  // Пропадет
let bookings = {};      // Пропадет

// ✅ РЕШЕНИЕ: использовать базу данных
// MongoDB, PostgreSQL, или хотя бы файлы
```

### 🔒 Безопасность токена

```javascript
// ✅ ПРАВИЛЬНО: токен в переменной окружения  
const token = process.env.BOT_TOKEN;

// ❌ НЕПРАВИЛЬНО: токен в коде
const token = '123:ABC...';  // Никогда так не делать!
```

### 🌍 Часовые пояса

```javascript
// ⚠️ ВНИМАНИЕ: время показывается по серверу
const now = new Date();  // Время сервера

// 🔧 Для разных часовых поясов используйте:
const warsawTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Warsaw"});
```

## 🚀 Идеи для улучшений

### 📧 Email уведомления

```javascript
const nodemailer = require('nodemailer');

function sendConfirmationEmail(userEmail, lessonDetails) {
    // Отправка подтверждения ученику
}
```

### 💳 Онлайн платежи

```javascript
const stripe = require('stripe')(process.env.STRIPE_KEY);

// Генерация ссылки на оплату
```

### 📱 Напоминания

```javascript
// Отправка напоминания за 24 часа до урока
setTimeout(() => {
    bot.sendMessage(userId, 'Напоминание: урок завтра в 15:00');
}, millisecondsUntilReminder);
```

### 🗓 Google Calendar

```javascript
const {google} = require('googleapis');

// Автоматическое создание событий в календаре
```

## 📋 Чек-лист перед запуском

- ✅ Токен бота обновлен
- ✅ Контактные данные изменены
- ✅ Цены актуальны
- ✅ Расписание настроено
- ✅ Бот протестирован
- ✅ Render сервис запущен
- ✅ Пользовательские гайды созданы

---

**Готово к использованию! 🎉🇵🇱**