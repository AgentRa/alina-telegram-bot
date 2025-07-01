# 👩‍🏫 Polish Teacher Bot - Гайд для преподавателя

## 🎯 Как управлять ботом

### 📊 Статистика в реальном времени

**В Render Dashboard** вы можете видеть:
- Количество активных пользователей
- Сколько записей сделано
- Логи всех действий
- Ошибки и проблемы

### 📋 Управление расписанием

**Код бота автоматически:**
- ✅ Показывает только доступные слоты (через 2+ часа от текущего времени)
- ✅ Блокирует занятые времена
- ✅ Сохраняет контактные данные учеников

**Чтобы изменить расписание**, отредактируйте в коде:
```javascript
const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'];
```

### 💰 Управление ценами

В файле `polish-teacher-bot.js` найдите секцию `lessonTypes`:
```javascript
'beginner': {
    name: '🟢 Początkujący (A1-A2)',
    price: '60 zł',  // ← Измените здесь
    duration: '60 min'
}
```

### 📧 Уведомления о новых записях

**Каждая запись сохраняется в переменной `bookings`**

Чтобы получать уведомления на email при новой записи, добавьте в код:
```javascript
// После успешной записи отправляйте себе email
console.log(`Новая запись: ${userName} на ${day} ${time}`);
```

## 🔧 Администрирование

### 📈 Логи и мониторинг

**В Render Dashboard** → **Logs** можете видеть:
- Все сообщения пользователей
- Ошибки бота
- Новые записи
- Попытки отмены

### 🚫 Блокировка пользователей

Если нужно заблокировать спам, добавьте в код:
```javascript
const blockedUsers = [123456789, 987654321]; // ID пользователей

bot.on('message', (msg) => {
    if (blockedUsers.includes(msg.from.id)) {
        return; // Игнорировать
    }
    // ... остальной код
});
```

### 📊 Экспорт данных

Для получения списка всех записей добавьте команду:
```javascript
bot.onText(/\/admin_export/, (msg) => {
    const chatId = msg.chat.id;
    
    // Проверка, что это вы (замените на свой ID)
    if (msg.from.id !== YOUR_TELEGRAM_ID) return;
    
    const exportData = JSON.stringify(bookings, null, 2);
    bot.sendMessage(chatId, exportData);
});
```

## 🔄 Обновления бота

### Как добавить новые функции:

1. **Измените код** в WebStorm
2. **Commit изменения**: `git add . && git commit -m "описание"`  
3. **Push на GitHub**: `git push origin main`
4. **Render автоматически** обновит бота за 2-3 минуты

### 💡 Идеи для улучшений:

#### 🗓 Интеграция с Google Calendar
```javascript
// Автоматически создавать события в вашем календаре
const { google } = require('googleapis');
```

#### 📧 Email уведомления
```javascript
const nodemailer = require('nodemailer');
// Отправлять подтверждения ученикам
```

#### 💳 Онлайн платежи
```javascript
// Интеграция с Stripe или PayU
const stripe = require('stripe')('ваш_ключ');
```

#### 📱 Уведомления в WhatsApp
```javascript
// Интеграция с WhatsApp Business API
```

## 🎯 Бизнес-аналитика

### 📊 Какие данные собирает бот:

- **Популярные типы уроков**
- **Предпочитаемое время**
- **Количество записей в день/неделю**
- **Email и телефоны для рассылки**

### 📈 Как анализировать эффективность:

1. **Render Logs** → считайте записи
2. **Google Analytics** → добавьте события
3. **Telegram Analytics** → статистика бота

## 🆘 Что делать при проблемах

### 🤖 Бот не отвечает
1. **Render Dashboard** → проверьте статус
2. **Logs** → найдите ошибки
3. **Restart** сервиса в Render

### 🔑 Проблемы с токеном
1. **BotFather** → `/mybots` → выберите бота
2. **API Token** → скопируйте новый
3. **Render** → обновите BOT_TOKEN

### 💾 Потеря данных
⚠️ **Важно**: Данные хранятся в памяти и исчезают при перезапуске!

**Решение**: Добавьте базу данных (MongoDB, PostgreSQL)

## 📞 Контакт с учениками

### 🔍 Как найти контакты ученика:

В логах Render найдите:
```
Email записан: student@email.com
Телефон: +48 123 456 789
Пользователь: @username (ID: 123456789)
```

### 📨 Массовая рассылка

Добавьте админ-команду для рассылки:
```javascript
bot.onText(/\/admin_broadcast (.+)/, (msg, match) => {
    if (msg.from.id !== YOUR_ID) return;
    
    const message = match[1];
    Object.keys(userSessions).forEach(userId => {
        bot.sendMessage(userId, message);
    });
});
```

## 🔒 Безопасность

### 🛡 Защита от спама:

```javascript
const userLimits = {};

bot.on('message', (msg) => {
    const userId = msg.from.id;
    const now = Date.now();
    
    if (!userLimits[userId]) {
        userLimits[userId] = { count: 0, lastMessage: now };
    }
    
    // Не больше 10 сообщений в минуту
    if (userLimits[userId].count > 10 && now - userLimits[userId].lastMessage < 60000) {
        return; // Игнорировать
    }
    
    userLimits[userId].count++;
    userLimits[userId].lastMessage = now;
});
```

### 🔐 Защита админ-команд:

```javascript
const ADMIN_ID = 123456789; // Ваш Telegram ID

function isAdmin(userId) {
    return userId === ADMIN_ID;
}
```

## 💡 Полезные команды для разработки

### 🔍 Отладка в Render:
```bash
# Смотреть логи в реальном времени
render logs --tail --service=polish-teacher-bot
```

### 📊 Проверка статуса:
```bash
# Статус всех сервисов
render services list
```

## 🚀 Масштабирование

### 📈 Когда учеников станет больше:

1. **База данных**: MongoDB или PostgreSQL
2. **Файлы**: AWS S3 для материалов
3. **Уведомления**: Email сервис (SendGrid)
4. **Аналитика**: Google Analytics 4
5. **Платежи**: Stripe или PayU

### 💰 Монетизация:

- **Предоплата** через бота
- **Пакеты уроков** со скидкой
- **VIP статус** с дополнительными материалами
- **Групповые уроки** по специальной цене

---

**Удачи в преподавании! 🇵🇱📚**