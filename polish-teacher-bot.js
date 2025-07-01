const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Хранилище данных (в продакшене лучше использовать базу данных)
let userSessions = {};
let teacherSchedule = {};
let bookings = {};

// Типы уроков
const lessonTypes = {
    'beginner': {
        name: '🟢 Początkujący (A1-A2)',
        description: 'Lekcje dla początkujących - podstawy języka polskiego',
        price: '60 zł',
        duration: '60 min'
    },
    'intermediate': {
        name: '🟡 Średniozaawansowany (B1-B2)',
        description: 'Lekcje dla średnio zaawansowanych - rozwój umiejętności',
        price: '70 zł',
        duration: '60 min'
    },
    'advanced': {
        name: '🔴 Zaawansowany (C1-C2)',
        description: 'Lekcje dla zaawansowanych - perfekcyjny polski',
        price: '80 zł',
        duration: '60 min'
    },
    'conversation': {
        name: '💬 Konwersacje',
        description: 'Praktyka mówienia i rozmowy codzienne',
        price: '65 zł',
        duration: '60 min'
    },
    'business': {
        name: '💼 Polski biznesowy',
        description: 'Język polski w biznesie i pracy',
        price: '85 zł',
        duration: '60 min'
    },
    'exam': {
        name: '📝 Przygotowanie do egzaminów',
        description: 'Przygotowanie do certyfikatów z języka polskiego',
        price: '90 zł',
        duration: '90 min'
    }
};

// Инициализация расписания учителя
function initializeSchedule() {
    const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
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
                lessonType: null,
                bookedAt: null
            };
        });
    });
}

// Генерация доступных слотов времени
function getAvailableTimeSlots() {
    const now = new Date();
    const currentHour = now.getHours();
    const slots = [];
    
    // Показываем слоты только с текущего времени + 2 часа
    const minHour = currentHour + 2;
    
    Object.keys(teacherSchedule).forEach(day => {
        Object.keys(teacherSchedule[day]).forEach(time => {
            const slot = teacherSchedule[day][time];
            const slotHour = parseInt(time.split(':')[0]);
            
            // Показываем только доступные слоты после текущего времени
            if (slot.available && slotHour >= minHour) {
                slots.push({
                    text: `${day} ${time}`,
                    callback_data: `time_${slot.id}`
                });
            }
        });
    });
    
    return slots.slice(0, 12); // Ограничиваем до 12 слотов
}

// Валидация email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Инициализация при запуске
initializeSchedule();

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
bot.on('callback_query', (callbackQuery) => {
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
        showLessonTypes(chatId, messageId, userId);
    } else if (data.startsWith('lesson_')) {
        const lessonType = data.replace('lesson_', '');
        userSessions[userId].lessonType = lessonType;
        userSessions[userId].step = 'time_selection';
        showTimeSlots(chatId, messageId, userId);
    } else if (data.startsWith('time_')) {
        const timeSlotId = data.replace('time_', '');
        userSessions[userId].timeSlot = timeSlotId;
        userSessions[userId].step = 'contact_info';
        askForContactInfo(chatId, messageId, userId);
    } else if (data === 'confirm_booking') {
        confirmBooking(chatId, messageId, userId);
    } else if (data === 'cancel_booking') {
        cancelCurrentBooking(chatId, messageId, userId);
    } else if (data === 'my_bookings') {
        showUserBookings(chatId, messageId, userId);
    } else if (data === 'info') {
        showInfo(chatId, messageId);
    } else if (data === 'contact') {
        showContact(chatId, messageId);
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
function showLessonTypes(chatId, messageId, userId) {
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
    return `${lesson.name}\n💰 ${lesson.price} | ⏰ ${lesson.duration}\n${lesson.description}\n`;
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
function showTimeSlots(chatId, messageId, userId) {
    const availableSlots = getAvailableTimeSlots();
    
    if (availableSlots.length === 0) {
        bot.editMessageText(
            '😔 Przepraszam, wszystkie terminy na najbliższą przyszłość są zajęte.\n\nSkontaktuj się ze mną bezpośrednio: anna.kowalska@email.com',
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
⏰ Czas trwania: ${selectedLesson.duration}

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
function askForContactInfo(chatId, messageId, userId) {
    const session = userSessions[userId];
    const selectedLesson = lessonTypes[session.lessonType];
    const timeSlotId = session.timeSlot;
    const [day, time] = timeSlotId.split('_');

    const message = `
✅ *Wybrano:*
📚 ${selectedLesson.name}
📅 ${day}, ${time}
💰 ${selectedLesson.price}

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
(np. +48 123 456 789)
`);
        } else {
            bot.sendMessage(chatId, '❌ Podaj prawidłowy adres email (np. nazwa@domena.pl)');
        }
    } else if (session.step === 'waiting_phone') {
        session.phone = text;
        session.step = 'confirmation';
        showBookingConfirmation(chatId, userId);
    }
});

// Показать подтверждение бронирования
function showBookingConfirmation(chatId, userId) {
    const session = userSessions[userId];
    const selectedLesson = lessonTypes[session.lessonType];
    const [day, time] = session.timeSlot.split('_');

    const message = `
📋 *Potwierdzenie rezerwacji:*

👤 **Dane kontaktowe:**
📧 Email: ${session.email}
📱 Telefon: ${session.phone}

📚 **Lekcja:**
${selectedLesson.name}
${selectedLesson.description}

📅 **Termin:**
${day}, ${time}
⏰ Czas trwania: ${selectedLesson.duration}

💰 **Koszt:** ${selectedLesson.price}

🔗 **Link do Zoom zostanie przesłany na email przed lekcją**

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
function confirmBooking(chatId, messageId, userId) {
    const session = userSessions[userId];
    const [day, time] = session.timeSlot.split('_');
    
    // Занимаем слот
    teacherSchedule[day][time].available = false;
    teacherSchedule[day][time].studentId = userId;
    teacherSchedule[day][time].studentName = session.email;
    teacherSchedule[day][time].lessonType = session.lessonType;
    teacherSchedule[day][time].bookedAt = new Date();

    // Сохраняем бронирование
    if (!bookings[userId]) {
        bookings[userId] = [];
    }
    
    bookings[userId].push({
        id: session.timeSlot,
        lessonType: session.lessonType,
        day: day,
        time: time,
        email: session.email,
        phone: session.phone,
        bookedAt: new Date(),
        status: 'confirmed'
    });

    const selectedLesson = lessonTypes[session.lessonType];

    bot.editMessageText(`
🎉 *Rezerwacja potwierdzona!*

📅 **${day}, ${time}**
📚 **${selectedLesson.name}**
💰 **${selectedLesson.price}**

📧 **Szczegóły wysłane na:** ${session.email}

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
}

// Отменить текущее бронирование
function cancelCurrentBooking(chatId, messageId, userId) {
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
function showUserBookings(chatId, messageId, userId) {
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
        message += `${index + 1}. **${booking.day}, ${booking.time}**\n`;
        message += `📚 ${lesson.name}\n`;
        message += `💰 ${lesson.price}\n`;
        message += `📧 ${booking.email}\n\n`;
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
function showInfo(chatId, messageId) {
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
function showContact(chatId, messageId) {
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

console.log('🇵🇱 Polski Teacher Bot запущен...');
