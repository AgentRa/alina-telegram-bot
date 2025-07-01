const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const moment = require('moment-timezone');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Настройки Google Calendar
const GOOGLE_CREDENTIALS = process.env.GOOGLE_CREDENTIALS; // JSON строка с credentials
const CALENDAR_ID = process.env.CALENDAR_ID || 'primary'; // ID календаря
const TIMEZONE = 'Europe/Warsaw'; // Timezone для Польши

// Инициализация Google Calendar API
let calendar = null;

function initializeGoogleCalendar() {
    try {
        if (GOOGLE_CREDENTIALS) {
            const credentials = JSON.parse(GOOGLE_CREDENTIALS);
            const auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/calendar']
            });
            calendar = google.calendar({ version: 'v3', auth });
            console.log('✅ Google Calendar API инициализирован');
        } else {
            console.log('⚠️ Google Calendar не настроен - используется локальное расписание');
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Google Calendar:', error.message);
    }
}

// Хранилище данных (в продакшене лучше использовать базу данных)
let userSessions = {};
let localSchedule = {}; // Fallback если календарь недоступен
let bookings = {};

// Типы уроков
const lessonTypes = {
    'beginner': {
        name: '🟢 Początkujący (A1-A2)',
        description: 'Lekcje dla początkujących - podstawy języka polskiego',
        price: '60 zł',
        duration: 60 // в минутах
    },
    'intermediate': {
        name: '🟡 Średniozaawansowany (B1-B2)',
        description: 'Lekcje dla średnio zaawansowanych - rozwój umiejętności',
        price: '70 zł',
        duration: 60
    },
    'advanced': {
        name: '🔴 Zaawansowany (C1-C2)',
        description: 'Lekcje dla zaawansowanych - perfekcyjny polski',
        price: '80 zł',
        duration: 60
    },
    'conversation': {
        name: '💬 Konwersacje',
        description: 'Praktyka mówienia i rozmowy codzienne',
        price: '65 zł',
        duration: 60
    },
    'business': {
        name: '💼 Polski biznesowy',
        description: 'Język polski w biznesie i pracy',
        price: '85 zł',
        duration: 60
    },
    'exam': {
        name: '📝 Przygotowanie do egzaminów',
        description: 'Przygotowanie do certyfikatów z języka polskiego',
        price: '90 zł',
        duration: 90
    }
};

// Рабочие часы учителя
const WORKING_HOURS = {
    start: 9, // 9:00
    end: 20,  // 20:00
    slotDuration: 90, // 90 минут на слот (60 мин урок + 30 мин перерыв)
    workingDays: [1, 2, 3, 4, 5, 6] // Пн-Сб (0 = воскресенье)
};

// Получение доступных слотов времени (улучшенная версия)
async function getAvailableTimeSlots() {
    const slots = [];
    const now = moment().tz(TIMEZONE);
    
    // Показываем слоты на следующие 14 дней
    for (let day = 0; day < 14; day++) {
        const currentDate = moment(now).add(day, 'days');
        
        // Пропускаем воскресенье и прошедшие дни
        if (!WORKING_HOURS.workingDays.includes(currentDate.day())) {
            continue;
        }
        
        // Для сегодняшнего дня проверяем, что время еще не прошло
        const startHour = day === 0 ? Math.max(WORKING_HOURS.start, now.hour() + 2) : WORKING_HOURS.start;
        
        for (let hour = startHour; hour < WORKING_HOURS.end; hour += 1.5) {
            const slotTime = moment(currentDate).hour(Math.floor(hour)).minute((hour % 1) * 60).second(0);
            
            // Проверяем доступность слота
            const isAvailable = await isSlotAvailable(slotTime);
            
            if (isAvailable) {
                slots.push({
                    text: slotTime.format('DD.MM (ddd) HH:mm'),
                    callback_data: `time_${slotTime.format('YYYY-MM-DD_HH:mm')}`
                });
            }
            
            // Ограничиваем количество показываемых слотов
            if (slots.length >= 20) break;
        }
        
        if (slots.length >= 20) break;
    }
    
    return slots;
}

// Проверка доступности слота
async function isSlotAvailable(slotTime) {
    // Если Google Calendar настроен, проверяем в нем
    if (calendar) {
        try {
            const startTime = slotTime.toISOString();
            const endTime = slotTime.clone().add(WORKING_HOURS.slotDuration, 'minutes').toISOString();
            
            const response = await calendar.events.list({
                calendarId: CALENDAR_ID,
                timeMin: startTime,
                timeMax: endTime,
                singleEvents: true,
                orderBy: 'startTime',
            });
            
            // Если есть события в это время, слот занят
            return response.data.items.length === 0;
        } catch (error) {
            console.error('Ошибка проверки календаря:', error.message);
            // Fallback на локальную проверку
        }
    }
    
    // Локальная проверка (fallback)
    const slotKey = slotTime.format('YYYY-MM-DD_HH:mm');
    return !localSchedule[slotKey];
}

// Создание события в Google Calendar
async function createCalendarEvent(slotTime, lessonType, userInfo) {
    if (!calendar) {
        // Сохраняем локально если календарь недоступен
        const slotKey = slotTime.format('YYYY-MM-DD_HH:mm');
        localSchedule[slotKey] = {
            lessonType,
            userInfo,
            createdAt: new Date()
        };
        return { success: true, eventId: slotKey };
    }
    
    try {
        const lesson = lessonTypes[lessonType];
        const startTime = slotTime.toISOString();
        const endTime = slotTime.clone().add(lesson.duration, 'minutes').toISOString();
        
        const event = {
            summary: `Lekcja: ${lesson.name}`,
            description: `
Typ lekcji: ${lesson.name}
Cena: ${lesson.price}
Student: ${userInfo.email}
Telefon: ${userInfo.phone}
Telegram ID: ${userInfo.userId}

${lesson.description}
            `.trim(),
            start: {
                dateTime: startTime,
                timeZone: TIMEZONE,
            },
            end: {
                dateTime: endTime,
                timeZone: TIMEZONE,
            },
            attendees: [
                { email: userInfo.email }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // За 24 часа
                    { method: 'email', minutes: 60 },      // За час
                ],
            },
        };
        
        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event,
        });
        
        return { success: true, eventId: response.data.id };
    } catch (error) {
        console.error('Ошибка создания события:', error.message);
        // Fallback на локальное сохранение
        const slotKey = slotTime.format('YYYY-MM-DD_HH:mm');
        localSchedule[slotKey] = { lessonType, userInfo, createdAt: new Date() };
        return { success: true, eventId: slotKey };
    }
}

// Валидация email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Валидация телефона
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{8,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Инициализация
initializeGoogleCalendar();

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || msg.from.username;

    // Инициализируем сессию пользователя
    userSessions[userId] = {
        step: 'start',
        lessonType: null,
        timeSlot: null,
        email: null,
        phone: null
    };

    const welcomeMessage = `
🇵🇱 *Witaj ${userName}!*

Jestem Anna Kowalska, certyfikowany nauczyciel języka polskiego! 👩‍🏫

📚 *Oferuję profesjonalne lekcje online:*
• Indywidualne podejście do każdego ucznia
• Materiały dostosowane do poziomu
• Lekcje przez Zoom w wysokiej jakości
• Elastyczne godziny zajęć

🎯 *Moje specjalizacje:*
• Przygotowanie do egzaminów certyfikatowych
• Polski dla biznesu i pracy
• Konwersacje i wymowa
• Gramatyka od podstaw

💰 *Ceny: 60-90 zł za lekcję*
⏰ *Czas trwania: 60-90 minut*

📅 *Automatyczna synchronizacja z kalendarzem Google*

Aby umówić lekcję, kliknij przycisk poniżej! 👇
`;

    const keyboard = {
        inline_keyboard: [
            [{ text: '📅 Umów lekcję', callback_data: 'book_lesson' }],
            [{ text: '📋 Moje rezerwacje', callback_data: 'my_bookings' }],
            [{ text: 'ℹ️ Informacje', callback_data: 'info' }],
            [{ text: '📞 Kontakt', callback_data: 'contact' }]
        ]
    };

    bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

// Обработка callback queries
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    // Инициализируем сессию если нет
    if (!userSessions[userId]) {
        userSessions[userId] = {
            step: 'start',
            lessonType: null,
            timeSlot: null,
            email: null,
            phone: null
        };
    }

    // Отвечаем на callback query
    bot.answerCallbackQuery(callbackQuery.id);

    if (data === 'book_lesson') {
        await showLessonTypes(chatId, messageId, userId);
    } else if (data.startsWith('lesson_')) {
        const lessonType = data.replace('lesson_', '');
        userSessions[userId].lessonType = lessonType;
        userSessions[userId].step = 'time_selection';
        await showTimeSlots(chatId, messageId, userId);
    } else if (data.startsWith('time_')) {
        const timeSlotId = data.replace('time_', '');
        userSessions[userId].timeSlot = timeSlotId;
        userSessions[userId].step = 'contact_info';
        await askForContactInfo(chatId, messageId, userId);
    } else if (data === 'confirm_booking') {
        await confirmBooking(chatId, messageId, userId);
    } else if (data === 'cancel_booking') {
        await cancelCurrentBooking(chatId, messageId, userId);
    } else if (data === 'my_bookings') {
        await showUserBookings(chatId, messageId, userId);
    } else if (data === 'info') {
        await showInfo(chatId, messageId);
    } else if (data === 'contact') {
        await showContact(chatId, messageId);
    } else if (data === 'back_to_main') {
        bot.editMessageText('Wybierz opcję:', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📅 Umów lekcję', callback_data: 'book_lesson' }],
                    [{ text: '📋 Moje rezerwacje', callback_data: 'my_bookings' }],
                    [{ text: 'ℹ️ Informacje', callback_data: 'info' }],
                    [{ text: '📞 Kontakt', callback_data: 'contact' }]
                ]
            }
        });
    }
});

// Показать типы уроков
async function showLessonTypes(chatId, messageId, userId) {
    const keyboard = [];
    
    Object.keys(lessonTypes).forEach(key => {
        keyboard.push([{
            text: lessonTypes[key].name,
            callback_data: `lesson_${key}`
        }]);
    });
    
    keyboard.push([{ text: '⬅️ Powrót', callback_data: 'back_to_main' }]);

    const message = `
📚 *Wybierz rodzaj lekcji:*

${Object.keys(lessonTypes).map(key => {
    const lesson = lessonTypes[key];
    return `${lesson.name}\n💰 ${lesson.price} | ⏰ ${lesson.duration} min\n${lesson.description}\n`;
}).join('\n')}
`;

    bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
    });
}

// Показать доступные слоты времени (улучшенная версия)
async function showTimeSlots(chatId, messageId, userId) {
    // Показываем индикатор загрузки
    bot.editMessageText('🔄 Sprawdzam dostępne terminy...', {
        chat_id: chatId,
        message_id: messageId
    });
    
    const availableSlots = await getAvailableTimeSlots();
    
    if (availableSlots.length === 0) {
        bot.editMessageText(
            '😔 Przepraszam, wszystkie terminy na najbliższe 2 tygodnie są zajęte.\n\n📧 Skontaktuj się ze mną bezpośrednio: anna.kowalska@email.com\n📱 WhatsApp: +48 123 456 789',
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Powrót', callback_data: 'book_lesson' }]
                    ]
                }
            }
        );
        return;
    }

    const keyboard = [];
    
    // Добавляем слоты по 2 в ряд
    for (let i = 0; i < availableSlots.length; i += 2) {
        const row = [availableSlots[i]];
        if (i + 1 < availableSlots.length) {
            row.push(availableSlots[i + 1]);
        }
        keyboard.push(row);
    }
    
    keyboard.push([{ text: '⬅️ Powrót', callback_data: 'book_lesson' }]);

    const selectedLesson = lessonTypes[userSessions[userId].lessonType];
    const message = `
📅 *Dostępne terminy dla: ${selectedLesson.name}*

💰 Cena: ${selectedLesson.price}
⏰ Czas trwania: ${selectedLesson.duration} minut

🗓️ *Dostępne terminy na najbliższe 2 tygodnie:*
Wybierz dogodny dla Ciebie termin:
`;

    bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
    });
}

// Запросить контактную информацию
async function askForContactInfo(chatId, messageId, userId) {
    const session = userSessions[userId];
    const selectedLesson = lessonTypes[session.lessonType];
    const slotTime = moment(session.timeSlot, 'YYYY-MM-DD_HH:mm').tz(TIMEZONE);

    const message = `
✅ *Wybrano:*
📚 ${selectedLesson.name}
📅 ${slotTime.format('DD.MM.YYYY (dddd) HH:mm')}
💰 ${selectedLesson.price}
⏰ Czas trwania: ${selectedLesson.duration} minut

📧 *Podaj swój email dla potwierdzenia:*
(Wyślij wiadomość z adresem email)
`;

    bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '⬅️ Zmień termin', callback_data: 'book_lesson' }]
            ]
        }
    });

    userSessions[userId].step = 'waiting_email';
}

// Обработка текстовых сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    // Игнорируем команды
    if (text.startsWith('/')) return;

    if (!userSessions[userId]) return;

    const session = userSessions[userId];

    if (session.step === 'waiting_email') {
        if (isValidEmail(text)) {
            session.email = text;
            session.step = 'waiting_phone';
            
            bot.sendMessage(chatId, `
✅ Email zapisany: ${text}

📱 *Teraz podaj numer telefonu:*
(np. +48 123 456 789 lub 123456789)
`, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Podaj prawidłowy adres email (np. nazwa@domena.pl)');
        }
    } else if (session.step === 'waiting_phone') {
        if (isValidPhone(text)) {
            session.phone = text;
            session.step = 'confirmation';
            showBookingConfirmation(chatId, userId);
        } else {
            bot.sendMessage(chatId, '❌ Podaj prawidłowy numer telefonu (np. +48 123 456 789)');
        }
    }
});

// Показать подтверждение бронирования
function showBookingConfirmation(chatId, userId) {
    const session = userSessions[userId];
    const selectedLesson = lessonTypes[session.lessonType];
    const slotTime = moment(session.timeSlot, 'YYYY-MM-DD_HH:mm').tz(TIMEZONE);

    const message = `
📋 *Potwierdzenie rezerwacji:*

👤 **Dane kontaktowe:**
📧 Email: ${session.email}
📱 Telefon: ${session.phone}

📚 **Lekcja:**
${selectedLesson.name}
${selectedLesson.description}

📅 **Termin:**
${slotTime.format('DD.MM.YYYY (dddd)')}
🕐 ${slotTime.format('HH:mm')} - ${slotTime.clone().add(selectedLesson.duration, 'minutes').format('HH:mm')}
⏰ Czas trwania: ${selectedLesson.duration} minut

💰 **Koszt:** ${selectedLesson.price}

🔗 **Link do Zoom zostanie przesłany na email przed lekcją**
📅 **Wydarzenie zostanie dodane do kalendarza Google**

Czy potwierdzasz rezerwację?
`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '✅ Potwierdź', callback_data: 'confirm_booking' },
                { text: '❌ Anuluj', callback_data: 'cancel_booking' }
            ]
        ]
    };

    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
}

// Подтвердить бронирование
async function confirmBooking(chatId, messageId, userId) {
    const session = userSessions[userId];
    const selectedLesson = lessonTypes[session.lessonType];
    const slotTime = moment(session.timeSlot, 'YYYY-MM-DD_HH:mm').tz(TIMEZONE);
    
    // Показываем индикатор обработки
    bot.editMessageText('🔄 Przetwarzam rezerwację...', {
        chat_id: chatId,
        message_id: messageId
    });
    
    try {
        // Создаем событие в календаре
        const result = await createCalendarEvent(slotTime, session.lessonType, {
            userId: userId,
            email: session.email,
            phone: session.phone,
            name: session.email.split('@')[0] // Используем часть email как имя
        });
        
        if (result.success) {
            // Сохраняем бронирование
            if (!bookings[userId]) {
                bookings[userId] = [];
            }
            
            bookings[userId].push({
                id: result.eventId,
                lessonType: session.lessonType,
                dateTime: session.timeSlot,
                email: session.email,
                phone: session.phone,
                bookedAt: new Date(),
                status: 'confirmed'
            });

            bot.editMessageText(`
🎉 *Rezerwacja potwierdzona!*

📅 **${slotTime.format('DD.MM.YYYY (dddd) HH:mm')}**
📚 **${selectedLesson.name}**
💰 **${selectedLesson.price}**

📧 **Szczegóły wysłane na:** ${session.email}
📅 **Dodano do kalendarza Google**

📝 **Co dalej:**
• Za 24h przed lekcją wyślę link do Zoom
• Przygotuj materiały do nauki
• W razie pytań pisz: anna.kowalska@email.com

Do zobaczenia na lekcji! 🇵🇱
`, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏠 Menu główne', callback_data: 'back_to_main' }]
                    ]
                }
            });

            // Очищаем сессию
            delete userSessions[userId];
        } else {
            throw new Error('Не удалось создать событие в календаре');
        }
    } catch (error) {
        console.error('Ошибка подтверждения бронирования:', error);
        bot.editMessageText('❌ Wystąpił błąd podczas rezerwacji. Spróbuj ponownie lub skontaktuj się bezpośrednio.', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔄 Spróbuj ponownie', callback_data: 'book_lesson' }],
                    [{ text: '🏠 Menu główne', callback_data: 'back_to_main' }]
                ]
            }
        });
    }
}

// Отменить текущее бронирование
async function cancelCurrentBooking(chatId, messageId, userId) {
    delete userSessions[userId];
    
    bot.editMessageText('❌ Rezerwacja anulowana.', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [
                [{ text: '🏠 Menu główne', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Показать бронирования пользователя
async function showUserBookings(chatId, messageId, userId) {
    const userBookingsList = bookings[userId] || [];
    
    if (userBookingsList.length === 0) {
        bot.editMessageText('📝 Nie masz żadnych rezerwacji.', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📅 Umów lekcję', callback_data: 'book_lesson' }],
                    [{ text: '⬅️ Powrót', callback_data: 'back_to_main' }]
                ]
            }
        });
        return;
    }

    let message = '📋 *Twoje rezerwacje:*\n\n';
    
    userBookingsList.forEach((booking, index) => {
        const lesson = lessonTypes[booking.lessonType];
        const bookingTime = moment(booking.dateTime, 'YYYY-MM-DD_HH:mm').tz(TIMEZONE);
        
        message += `${index + 1}. **${bookingTime.format('DD.MM.YYYY (dddd) HH:mm')}**\n`;
        message += `📚 ${lesson.name}\n`;
        message += `💰 ${lesson.price}\n`;
        message += `📧 ${booking.email}\n`;
        message += `📱 ${booking.phone}\n\n`;
    });

    bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📅 Umów nową lekcję', callback_data: 'book_lesson' }],
                [{ text: '⬅️ Powrót', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Показать информацию
async function showInfo(chatId, messageId) {
    const calendarStatus = calendar ? '✅ Połączony z Google Calendar' : '⚠️ Lokalne zarządzanie terminami';
    
    const message = `
ℹ️ **Informacje o lekcjach:**

👩‍🏫 **Anna Kowalska**
• Certyfikowany nauczyciel języka polskiego
• 8 lat doświadczenia w nauczaniu online
• Specjalizacja: egzaminy, biznes, konwersacje

📚 **Poziomy nauczania:**
• A1-A2 (Początkujący)
• B1-B2 (Średniozaawansowany) 
• C1-C2 (Zaawansowany)

🎯 **Metody nauczania:**
• Komunikatywna metoda nauki
• Materiały multimedialne
• Ćwiczenia praktyczne
• Symulacje sytuacji rzeczywistych

⏰ **Godziny pracy:**
Pon-Sob: 9:00-20:00

🔗 **Platforma:** Zoom
📱 **Wsparcie:** WhatsApp, Email
📅 **System:** ${calendarStatus}
`;

    bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '⬅️ Powrót', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Показать контакты
async function showContact(chatId, messageId) {
    const message = `
📞 **Kontakt:**

👩‍🏫 **Anna Kowalska**
📧 Email: anna.kowalska@email.com
📱 WhatsApp: +48 123 456 789
🌐 Website: www.polskionline.pl

📍 **Adres (lekcje stacjonarne):**
ul. Nowy Świat 15/3
00-497 Warszawa

⏰ **Godziny kontaktu:**
Pon-Pt: 8:00-21:00
Sob: 9:00-18:00
Niedz: 10:00-16:00

💬 **Języki obsługi:**
🇵🇱 Polski
🇬🇧 English  
🇺🇦 Українська
🇷🇺 Русский

📅 **Automatyczne zarządzanie kalendarzem**
🔄 **Synchronizacja z Google Calendar**
`;

    bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '⬅️ Powrót', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.log('Polling error:', error);
});

bot.on('error', (error) => {
    console.log('Bot error:', error);
});

console.log('🇵🇱 Polish Teacher Bot (улучшенная версия) запущен...');
console.log('📅 Google Calendar интеграция:', calendar ? 'Активна' : 'Недоступна (локальный режим)');
