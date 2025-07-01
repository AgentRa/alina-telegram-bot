const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Хранилище данных (в продакшене лучше использовать базу данных)
let timeSlots = {};
let userBookings = {};
let teacherSchedule = {};

// Инициализация расписания учителя (пример)
function initializeSchedule() {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'];
    
    days.forEach(day => {
        teacherSchedule[day] = {};
        times.forEach(time => {
            const slotId = `${day}_${time}`;
            teacherSchedule[day][time] = {
                id: slotId,
                available: true,
                studentId: null,
                studentName: null,
                lessonType: null
            };
        });
    });
}

// Типы занятий
const lessonTypes = {
    'beginner': '🟢 Начинающий (A1-A2)',
    'intermediate': '🟡 Средний (B1-B2)', 
    'advanced': '🔴 Продвинутый (C1-C2)',
    'conversation': '💬 Разговорная практика',
    'business': '💼 Деловой польский',
    'grammar': '📚 Грамматика'
};

// Инициализация при запуске
initializeSchedule();

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || msg.from.username;

    if (!userBookings[msg.from.id]) {
        userBookings[msg.from.id] = [];
    }

    const welcomeMessage = `
🇵🇱 Cześć ${userName}! Witamy w systemie zapisów na lekcje polskiego!

Jestem Anna, Twój nauczyciel polskiego. Pomogę Ci zarezerwować lekcję.

📅 Dostępne komendy:
/schedule - Sprawdź dostępne terminy
/book - Zapisz się na lekcję  
/mybookings - Twoje rezerwacje
/cancel - Anuluj rezerwację
/types - Typy lekcji
/contact - Kontakt z nauczycielem
/help - Pomoc

💡 Lekcje trwają 60 minut
💰 Cena: 50 zł/lekcja
📍 Online via Zoom

Zacznij od /schedule aby zobaczyć dostępne terminy!
`;

    bot.sendMessage(chatId, welcomeMessage);
});

// Просмотр расписания
bot.onText(/\/schedule/, (msg) => {
    const chatId = msg.chat.id;
    
    let scheduleMessage = '📅 *Dostępne terminy na tej tygodniu:*\n\n';
    let hasAvailableSlots = false;

    Object.keys(teacherSchedule).forEach(day => {
        scheduleMessage += `*${day}:*\n`;
        
        Object.keys(teacherSchedule[day]).forEach(time => {
            const slot = teacherSchedule[day][time];
            if (slot.available) {
                scheduleMessage += `✅ ${time}\n`;
                hasAvailableSlots = true;
            } else {
                scheduleMessage += `❌ ${time} - zajęte\n`;
            }
        });
        scheduleMessage += '\n';
    });

    if (!hasAvailableSlots) {
        scheduleMessage += '😔 Brak dostępnych terminów w tym tygodniu.\nSkontaktuj się ze mną: /contact';
    } else {
        scheduleMessage += '\n📝 Aby się zapisać użyj: /book';
    }

    bot.sendMessage(chatId, scheduleMessage, {parse_mode: 'Markdown'});
});

// Типы занятий
bot.onText(/\/types/, (msg) => {
    const chatId = msg.chat.id;
    
    let typesMessage = '📚 *Dostęp