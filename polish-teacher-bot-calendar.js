const TelegramBot = require('node-telegram-bot-api');

// Define a local helper function for MarkdownV2 escaping
function escapeMarkdownV2(text) {
    if (typeof text !== 'string') {
        return '';
    }
    // Escape characters that have special meaning in MarkdownV2
    // List of special characters: _, *, [, ], (, ), ~, `, >, #, +, -, =, |, {, }, ., !
    return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\const TelegramBot = require('node-telegram-bot-api');');
}


const { google } = require('googleapis');
const moment = require('moment-timezone');
const http = require('http'); // Using built-in http for the server
const nodemailer = require('nodemailer'); // For sending emails
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const port = process.env.PORT || 3000;
const url = process.env.RENDER_EXTERNAL_URL; // The public URL of the Render service

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const TEACHER_EMAIL = process.env.TEACHER_EMAIL || 'anna.kowalska@email.com';

let transporter;
if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: EMAIL_SERVICE,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
    console.log('✅ Nodemailer транспортер инициализирован');
} else {
    console.log('⚠️ Переменные окружения для Email не настроены. Отправка Email будет недоступна.');
}

let bot;

if (!token) {
    console.error('❌ BOT_TOKEN не найден! Пожалуйста, добавьте его в переменные окружения.');
    process.exit(1);
}

// Если URL доступен (в продакшн на Render), используем вебхуки
if (url) {
    console.log('🚀 Запуск в режиме Webhook...');
    bot = new TelegramBot(token);
    bot.setWebHook(`${url}/bot${token}`);
    console.log(`✅ Вебхук установлен на ${url}/bot${token}`);

    // Создаем HTTP сервер для приема обновлений от Telegram
    const server = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === `/bot${token}`) {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const update = JSON.parse(body);
                    bot.processUpdate(update);
                    res.writeHead(200);
                    res.end();
                } catch (error) {
                    console.error('❌ Ошибка обработки обновления:', error);
                    res.writeHead(500);
                    res.end();
                }
            });
        } else {
            // Health check endpoint
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Бот работает в режиме вебхука!');
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`✅ Сервер для вебхуков запущен на порту ${port}`);
    });

} else {
    // В локальной среде используем polling для удобства разработки
    console.log('🔧 Запуск в режиме Polling для локальной разработки...');
    bot = new TelegramBot(token, { polling: true });
}


// Настройки Google Calendar и рабочего времени учителя
const GOOGLE_CREDENTIALS = process.env.GOOGLE_CREDENTIALS;
const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';
const TIMEZONE = process.env.TEACHER_TIMEZONE || 'Europe/Warsaw';

// Настройки рабочего времени учителя
const TEACHER_CONFIG = {
    workingHours: {
        start: parseInt(process.env.TEACHER_WORKING_HOURS_START) || 9,
        end: parseInt(process.env.TEACHER_WORKING_HOURS_END) || 20
    },
    lessonDuration: parseInt(process.env.LESSON_DURATION_MINUTES) || 60,
    breakBetweenLessons: parseInt(process.env.BREAK_BETWEEN_LESSONS_MINUTES) || 30,
    advanceBookingHours: parseInt(process.env.ADVANCE_BOOKING_HOURS) || 24,
    maxBookingDaysAhead: parseInt(process.env.MAX_BOOKING_DAYS_AHEAD) || 14,
    workingDays: (process.env.WORKING_DAYS || '1,2,3,4,5,6').split(',').map(d => parseInt(d))
};

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
            console.log(`📅 Календарь: ${CALENDAR_ID}`);
            console.log(`🕐 Рабочие часы: ${TEACHER_CONFIG.workingHours.start}:00-${TEACHER_CONFIG.workingHours.end}:00`);
        } else {
            console.log('⚠️ Google Calendar не настроен - используется локальное расписание');
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Google Calendar:', error.message);
    }
}

// Хранилище данных
let userSessions = {};
let localSchedule = {};
let bookings = {};
let userProfiles = {}; // Для хранения постоянных данных пользователя

// Типы уроков
const lessonTypes = {
    'beginner': {
        name: '🟢 Początkujący (A1-A2)',
        description: 'Lekcje dla początkujących - podstawy języka polskiego',
        price: '60 zł',
        duration: 60
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

// Получение событий из календаря учителя
async function getTeacherCalendarEvents(startDate, endDate) {
    if (!calendar) {
        return []; // Fallback - пустой календарь
    }
    
    try {
        console.log(`🔍 Проверяем календарь с ${startDate.format()} до ${endDate.format()}`);
        
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        const events = response.data.items || [];
        console.log(`📅 Найдено событий в календаре: ${events.length}`);
        
        return events.map(event => ({
            id: event.id,
            summary: event.summary || 'Занятое время',
            start: moment(event.start.dateTime || event.start.date).tz(TIMEZONE),
            end: moment(event.end.dateTime || event.end.date).tz(TIMEZONE),
            isAllDay: !event.start.dateTime
        }));
    } catch (error) {
        console.error('❌ Ошибка чтения календаря:', error.message);
        return [];
    }
}

// Поиск свободных слотов между событиями
async function findAvailableSlots() {
    const now = moment().tz(TIMEZONE);
    const startDate = now.clone().add(TEACHER_CONFIG.advanceBookingHours, 'hours');
    const endDate = now.clone().add(TEACHER_CONFIG.maxBookingDaysAhead, 'days');
    
    console.log(`🔍 Ищем свободные слоты с ${startDate.format('DD.MM.YYYY HH:mm')} до ${endDate.format('DD.MM.YYYY HH:mm')}`);
    
    // Получаем все события из календаря
    const events = await getTeacherCalendarEvents(startDate, endDate);
    
    const availableSlots = [];
    
    // Проходим по каждому дню
    for (let day = startDate.clone(); day.isBefore(endDate); day.add(1, 'day')) {
        // Пропускаем нерабочие дни
        if (!TEACHER_CONFIG.workingDays.includes(day.day())) {
            continue;
        }
        
        // События в этот день
        const dayEvents = events.filter(event => 
            event.start.format('YYYY-MM-DD') === day.format('YYYY-MM-DD') && !event.isAllDay
        ).sort((a, b) => a.start.valueOf() - b.start.valueOf());
        
        // Начало и конец рабочего дня
        const dayStart = day.clone().hour(TEACHER_CONFIG.workingHours.start).minute(0).second(0);
        const dayEnd = day.clone().hour(TEACHER_CONFIG.workingHours.end).minute(0).second(0);
        
        // Если это сегодня, начинаем не раньше startDate
        const actualStart = day.isSame(startDate, 'day') ? 
            moment.max(dayStart, startDate) : dayStart;
        
        // Ищем свободные промежутки
        let currentTime = actualStart.clone();
        
        for (const event of dayEvents) {
            // Проверяем свободное время до события
            const freeSlots = findSlotsBetween(currentTime, event.start);
            availableSlots.push(...freeSlots);
            
            // Переходим к концу события + перерыв
            currentTime = event.end.clone().add(TEACHER_CONFIG.breakBetweenLessons, 'minutes');
        }
        
        // Проверяем время после последнего события до конца рабочего дня
        const freeSlots = findSlotsBetween(currentTime, dayEnd);
        availableSlots.push(...freeSlots);
    }
    
    console.log(`✅ Найдено свободных слотов: ${availableSlots.length}`);
    return availableSlots.slice(0, 24); // Ограничиваем количество для удобства
}

// Поиск слотов между двумя временными точками
function findSlotsBetween(startTime, endTime) {
    const slots = [];
    const slotDuration = TEACHER_CONFIG.lessonDuration + TEACHER_CONFIG.breakBetweenLessons;
    
    let currentSlot = startTime.clone();
    
    while (currentSlot.clone().add(TEACHER_CONFIG.lessonDuration, 'minutes').isSameOrBefore(endTime)) {
        // Проверяем, что слот полностью в рабочих часах
        const slotEnd = currentSlot.clone().add(TEACHER_CONFIG.lessonDuration, 'minutes');
        
        if (currentSlot.hour() >= TEACHER_CONFIG.workingHours.start && 
            slotEnd.hour() <= TEACHER_CONFIG.workingHours.end) {
            
            slots.push({
                start: currentSlot.clone(),
                end: slotEnd,
                text: currentSlot.format('DD.MM (ddd) HH:mm'),
                callback_data: `time_${currentSlot.format('YYYY-MM-DD_HH:mm')}`
            });
        }
        
        currentSlot.add(slotDuration, 'minutes');
    }
    
    return slots;
}

// Создание события в календаре
async function createCalendarEvent(slotTime, lessonType, userInfo) {
    const lesson = lessonTypes[lessonType];
    const startTime = slotTime.clone();
    const endTime = startTime.clone().add(lesson.duration, 'minutes');
    
    if (!calendar) {
        // Локальное сохранение
        const slotKey = slotTime.format('YYYY-MM-DD_HH:mm');
        localSchedule[slotKey] = { lessonType, userInfo, createdAt: new Date() };
        return { success: true, eventId: slotKey };
    }
    
    try {
        const event = {
            summary: `${lesson.name} - ${userInfo.name}`,
            description: `
📚 Typ lekcji: ${lesson.name}
💰 Cena: ${lesson.price}
⏰ Czas trwania: ${lesson.duration} minut

👤 Student:
📝 Imię: ${userInfo.name}
📧 Email: ${userInfo.email}
📱 Telefon: ${userInfo.phone}
🆔 Telegram: ${userInfo.userId}

📝 Opis: ${lesson.description}

🤖 Utworzone przez: Polish Teacher Bot
            `.trim(),
            start: {
                dateTime: startTime.toISOString(),
                timeZone: TIMEZONE,
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: TIMEZONE,
            },
            
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'email', minutes: 60 },
                    { method: 'popup', minutes: 30 }
                ],
            },
            colorId: '2', // Зеленый цвет для уроков
        };
        
        console.log(`📅 Создаем событие: ${event.summary} на ${startTime.format('DD.MM.YYYY HH:mm')}`);
        
        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event,
            sendUpdates: 'all' // Отправляем приглашения
        });
        
        console.log(`✅ Событие создано с ID: ${response.data.id}`);
        return { success: true, eventId: response.data.id, meetLink: response.data.hangoutLink };
    } catch (error) {
        console.error('❌ Ошибка создания события:', error.message);
        // Fallback
        const slotKey = slotTime.format('YYYY-MM-DD_HH:mm');
        localSchedule[slotKey] = { lessonType, userInfo, createdAt: new Date() };
        return { success: true, eventId: slotKey };
    }
}

// Отправка email подтверждения
async function sendConfirmationEmail(bookingDetails) {
    if (!transporter) {
        console.log('⚠️ Email не отправлен: Nodemailer транспортер не инициализирован.');
        return;
    }

    const { email, lessonType, timeSlot, duration, price, meetLink, name } = bookingDetails;
    const selectedLesson = lessonTypes[lessonType];
    const slotTime = moment(timeSlot, 'YYYY-MM-DD_HH:mm').tz(TIMEZONE);

    const meetLinkHtml = meetLink ? `<p><b>Ссылка на Google Meet:</b> <a href="${meetLink}">${meetLink}</a></p>` : '';

    const mailOptions = {
        from: `"${TEACHER_EMAIL}" <${EMAIL_USER}>`,
        to: email,
        subject: `Potwierdzenie rezerwacji lekcji polskiego - ${selectedLesson.name}`,
        html: `
            <p>Witaj ${name},</p>
            <p>Dziękujemy za rezerwację lekcji języka polskiego!</p>
            <p>Oto szczegóły Twojej rezerwacji:</p>
            <ul>
                <li><b>Typ lekcji:</b> ${selectedLesson.name}</li>
                <li><b>Data i czas:</b> ${slotTime.format('DD.MM.YYYY (dddd) HH:mm')}</li>
                <li><b>Czas trwania:</b> ${duration} minut</li>
                <li><b>Koszt:</b> ${price}</li>
            </ul>
            ${meetLinkHtml}
            <p>Link do Zoom zostanie przesłany na Twój email na 24 godziny przed lekcją.</p>
            <p>W razie pytań, prosimy o kontakt: ${TEACHER_EMAIL}</p>
            <p>Do zobaczenia na lekcji!</p>
            <p>Z poważaniem,<br>Anna Kowalska</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email подтверждения отправлен на ${email}`);
    } catch (error) {
        console.error(`❌ Ошибка отправки email на ${email}:`, error);
    }
}

// Проверка статуса календаря для отладки
async function checkCalendarStatus() {
    if (!calendar) {
        return 'Календарь не настроен';
    }
    
    try {
        const response = await calendar.calendarList.list();
        const targetCalendar = response.data.items.find(cal => 
            cal.id === CALENDAR_ID || cal.id === 'primary'
        );
        
        if (targetCalendar) {
            return `Календарь доступен: ${targetCalendar.summary}`;
        } else {
            return `Календарь ${CALENDAR_ID} не найден`;
        }
    } catch (error) {
        return `Ошибка доступа: ${error.message}`;
    }
}

// Валидация
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Инициализация
initializeGoogleCalendar();

// Команда /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || msg.from.username;

    userSessions[userId] = {
        step: 'start',
        lessonType: null,
        timeSlot: null,
        email: null
    };

    // Проверяем, есть ли уже профиль пользователя
    if (userProfiles[userId]) {
        // Если профиль есть, используем его данные
        userSessions[userId].name = userProfiles[userId].name;
        userSessions[userId].email = userProfiles[userId].email;
        userSessions[userId].phone = userProfiles[userId].phone;
        await sendWelcomeMessage(chatId, userId, userProfiles[userId].name);
    } else {
        // Если профиля нет, запрашиваем имя
        userSessions[userId].step = 'waiting_name';
        bot.sendMessage(chatId, `
🇵🇱 *Witaj ${userName}!*

Jestem Anna Kowalska, certyfikowany nauczyciel języka polskiego! 👩‍🏫

Zanim zaczniemy, proszę, podaj swoje imię:`, { parse_mode: 'Markdown' });
    }
});

// Отправка приветственного сообщения (вынесено в отдельную функцию)
async function sendWelcomeMessage(chatId, userId, userName) {
    const calendarStatus = await checkCalendarStatus();
    console.log(`📊 Статус календаря для пользователя ${userId}: ${calendarStatus}`);

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

📅 *Terminy synchronizowane z moim rzeczywistym kalendarzem*
🔄 *Aktualne dostępne godziny w czasie rzeczywistym*

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
}

// Команда для отладки календаря (только для разработки)
bot.onText(/\/debug/, async (msg) => {
    const chatId = msg.chat.id;
    
    const status = await checkCalendarStatus();
    const slots = await findAvailableSlots();
    
    const debugInfo = `
🔧 *Debug информация:*

📅 Статус календаря: ${status}
🔍 Найдено слотов: ${slots.length}
⚙️ Рабочие часы: ${TEACHER_CONFIG.workingHours.start}-${TEACHER_CONFIG.workingHours.end}
📆 Рабочие дни: ${TEACHER_CONFIG.workingDays.join(', ')}
⏰ Длительность урока: ${TEACHER_CONFIG.lessonDuration} мин
⏳ Перерыв: ${TEACHER_CONFIG.breakBetweenLessons} мин

🕐 Ближайшие слоты:
${slots.slice(0, 5).map(slot => slot.text).join('\n')}
`;

    bot.sendMessage(chatId, debugInfo, { parse_mode: 'Markdown' });
});

// Обработка callback queries
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    if (!userSessions[userId]) {
        userSessions[userId] = {
            step: 'start',
            lessonType: null,
            timeSlot: null,
            email: null,
            phone: null
        };
    }

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

// Показать доступные слоты времени
async function showTimeSlots(chatId, messageId, userId) {
    bot.editMessageText('🔄 Sprawdzam mój kalendarz...', {
        chat_id: chatId,
        message_id: messageId
    });
    
    const availableSlots = await findAvailableSlots();
    
    if (availableSlots.length === 0) {
        bot.editMessageText(
            `😔 Przepraszam, nie mam wolnych terminów w najbliższych ${TEACHER_CONFIG.maxBookingDaysAhead} dniach.\n\n📧 Skontaktuj się ze mną bezpośrednio: anna.kowalska@email.com\n📱 WhatsApp: +48 123 456 789`,
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

🔄 *Terminy synchronizowane z moim rzeczywistym kalendarzem*
📊 Znaleziono ${availableSlots.length} wolnych terminów:
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

    // Если у нас уже есть данные пользователя, переходим к подтверждению
    if (userProfiles[userId] && userProfiles[userId].name && userProfiles[userId].email) {
        session.name = userProfiles[userId].name;
        session.email = userProfiles[userId].email;
        session.step = 'confirmation';
        showBookingConfirmation(chatId, userId);
        return;
    }

    const message = `
✅ *Wybrano:*
📚 ${selectedLesson.name}
📅 ${slotTime.format('DD.MM.YYYY (dddd) HH:mm')}
💰 ${selectedLesson.price}
⏰ Czas trwania: ${selectedLesson.duration} minut

📝 *Proszę, podaj swoje imię:*
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

    userSessions[userId].step = 'waiting_name_for_booking';
}

// Обработка текстовых сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text.startsWith('/')) return;
    if (!userSessions[userId]) return;

    const session = userSessions[userId];

    if (session.step === 'waiting_name') {
        session.name = text;
        userSessions[userId].step = 'waiting_email';
        bot.sendMessage(chatId, `
✅ Imię zapisane: ${text}

📧 *Teraz podaj swój email dla potwierdzenia:*
(Wyślij wiadomość z adresem email)
`, { parse_mode: 'Markdown' });
    } else if (session.step === 'waiting_name_for_booking') {
        session.name = text;
        userSessions[userId].step = 'waiting_email';
        bot.sendMessage(chatId, `
✅ Imię zapisane: ${text}

📧 *Teraz podaj swój email dla potwierdzenia:*
(Wyślij wiadomość z adresem email)
`, { parse_mode: 'Markdown' });
    } else if (session.step === 'waiting_email') {
        if (isValidEmail(text)) {
            session.email = text;
            // Сохраняем данные в userProfiles для будущего использования
            userProfiles[userId] = {
                name: session.name,
                email: session.email
            };
            session.step = 'confirmation';
            showBookingConfirmation(chatId, userId);
        } else {
            bot.sendMessage(chatId, '❌ Podaj prawidłowy adres email (np. nazwa@domena.pl)');
        }
    }
});

// Показать подтверждение бронирования
function showBookingConfirmation(chatId, userId) {
    const session = userSessions[userId];
    const selectedLesson = lessonTypes[session.lessonType];
    const slotTime = moment(session.timeSlot, 'YYYY-MM-DD_HH:mm').tz(TIMEZONE);

    const escapedName = escapeMarkdownV2(session.name || '');
    const escapedEmail = escapeMarkdownV2(session.email || '');
    const escapedPhone = escapeMarkdownV2(session.phone || '');

    const message = `
📋 *Potwierdzenie rezerwacji:*

👤 \*\*Dane kontaktowe:\*\*
📝 Imię: ${escapedName}
📧 Email: ${escapedEmail}

📚 \*\*Lekcja:\*\*
${escapeMarkdownV2(selectedLesson.name)}
${escapeMarkdownV2(selectedLesson.description)}

📅 \*\*Termin:\*\*
${escapeMarkdownV2(slotTime.format('DD.MM.YYYY (dddd)'))}
🕐 ${escapeMarkdownV2(slotTime.format('HH:mm'))} - ${escapeMarkdownV2(slotTime.clone().add(selectedLesson.duration, 'minutes').format('HH:mm'))}
⏰ Czas trwania: ${escapeMarkdownV2(selectedLesson.duration.toString())} minut

💰 \*\*Koszt:\*\* ${escapeMarkdownV2(selectedLesson.price)}

🔗 \*\*Link do Zoom zostanie przesłany na email przed lekcją\*\*
📅 \*\*Wydarzenie zostanie dodane do mojego kalendarza i Twojego\*\*
📧 \*\*Otrzymasz automatyczne przypomnienia\*\*

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

    try {
        bot.sendMessage(chatId, message, {
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard
        });
    } catch (error) {
        console.error('❌ Ошибка отправки сообщения подтверждения:', error.message);
        bot.sendMessage(chatId, 'Произошла ошибка при отображении подтверждения. Пожалуйста, попробуйте снова.');
    }
}

// Подтвердить бронирование
async function confirmBooking(chatId, messageId, userId) {
    const session = userSessions[userId];
    const selectedLesson = lessonTypes[session.lessonType];
    const slotTime = moment(session.timeSlot, 'YYYY-MM-DD_HH:mm').tz(TIMEZONE);
    
    bot.editMessageText('🔄 Tworzę wydarzenie w kalendarzu...', {
        chat_id: chatId,
        message_id: messageId
    });
    
    try {
        const result = await createCalendarEvent(slotTime, session.lessonType, {
            userId: userId,
            email: session.email,
            name: session.email.split('@')[0]
        });
        
        if (result.success) {
            if (!bookings[userId]) {
                bookings[userId] = [];
            }
            
            bookings[userId].push({
                id: result.eventId,
                lessonType: session.lessonType,
                dateTime: session.timeSlot,
                email: session.email,
                bookedAt: new Date(),
                status: 'confirmed'
            });

            // Отправляем email подтверждения пользователю
            await sendConfirmationEmail({
                email: session.email,
                lessonType: session.lessonType,
                timeSlot: session.timeSlot,
                duration: selectedLesson.duration,
                price: selectedLesson.price,
                meetLink: result.meetLink,
                name: session.name
            });

            const meetLinkText = result.meetLink ? `\n🔗 **Link Google Meet:** ${result.meetLink}` : '';

            bot.editMessageText(`
🎉 *Rezerwacja potwierdzona!*

📅 **${slotTime.format('DD.MM.YYYY (dddd) HH:mm')}**
📚 **${selectedLesson.name}**
💰 **${selectedLesson.price}**

📧 **Szczegóły wysłane na:** ${session.email}
📅 **Dodano do kalendarza Google**
🔔 **Automatyczne przypomnienia ustawione**${meetLinkText}

📝 **Co dalej:**
• Za 24h przed lekcją wyślę link do Zoom
• Przygotuj materiały do nauki
• W razie pytań pisz: anna.kowalska@email.com

Do zobaczenia na lekcji! 🇵🇱

🆔 **ID rezerwacji:** ${result.eventId.substring(0, 8)}
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

            delete userSessions[userId];
        } else {
            throw new Error('Не удалось создать событие в календаре');
        }
    } catch (error) {
        console.error('Ошибка подтверждения бронирования:', error);
        bot.editMessageText('❌ Wystąpił błąd podczas tworzenia rezerwacji. Spróbuj ponownie lub skontaktuj się bezpośrednio.', {
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
        message += `📚 ${lesson.name}
`;
        message += `💰 ${lesson.price}
`;
        message += `📧 ${booking.email}
`;
        message += `🆔 ID: ${booking.id.substring(0, 8)}

`;
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
    const calendarStatus = calendar ? '✅ Synchronizacja z kalendarzem Google' : '⚠️ Lokalne zarządzanie terminami';
    
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
Pon-Sob: ${TEACHER_CONFIG.workingHours.start}:00-${TEACHER_CONFIG.workingHours.end}:00

🔗 **Platforma:** Zoom
📱 **Wsparcie:** WhatsApp, Email
📅 **System:** ${calendarStatus}
🔄 **Automatyczne przypomnienia**
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
🔄 **Synchronizacja z Google Calendar w czasie rzeczywistym**
📧 **Automatyczne e-mail powiadomienia**
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

console.log('🇵🇱 Polish Teacher Bot (Calendar Integration) запущен...');
console.log('📅 Google Calendar интеграция:', calendar ? 'Активна' : 'Недоступна (локальный режим)');
console.log(`🕐 Рабочие часы: ${TEACHER_CONFIG.workingHours.start}:00-${TEACHER_CONFIG.workingHours.end}:00`);
console.log(`📆 Рабочие дни: ${TEACHER_CONFIG.workingDays.join(', ')} (1=Пн, 6=Сб)`);
console.log(`⏰ Длительность урока: ${TEACHER_CONFIG.lessonDuration} мин, перерыв: ${TEACHER_CONFIG.breakBetweenLessons} мин`);
