const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Получаем токен из переменных окружения
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Хранилище расписания (в реальном проекте лучше использовать базу данных)
let schedules = {};

// Команды бота
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, `
Привет! 👋 Я помогу вести расписание занятий.

Доступные команды:
/add - Добавить занятие
/list - Показать расписание
/delete - Удалить занятие
/today - Занятия на сегодня
/help - Справка
  `);
});

// Добавление занятия
bot.onText(/\/add (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!schedules[userId]) {
        schedules[userId] = [];
    }

    const lesson = match[1];
    schedules[userId].push({
        id: Date.now(),
        text: lesson,
        date: new Date().toLocaleDateString('ru-RU')
    });

    bot.sendMessage(chatId, `✅ Занятие добавлено: "${lesson}"`);
});

// Просмотр расписания
bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!schedules[userId] || schedules[userId].length === 0) {
        bot.sendMessage(chatId, '📝 Расписание пустое. Добавьте занятия командой /add');
        return;
    }

    let message = '📚 Ваше расписание:\n\n';
    schedules[userId].forEach((lesson, index) => {
        message += `${index + 1}. ${lesson.text} (${lesson.date})\n`;
    });

    bot.sendMessage(chatId, message);
});

// Удаление занятия
bot.onText(/\/delete (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const index = parseInt(match[1]) - 1;

    if (!schedules[userId] || !schedules[userId][index]) {
        bot.sendMessage(chatId, '❌ Занятие не найдено');
        return;
    }

    const deleted = schedules[userId].splice(index, 1)[0];
    bot.sendMessage(chatId, `🗑 Удалено: "${deleted.text}"`);
});

// Занятия на сегодня
bot.onText(/\/today/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const today = new Date().toLocaleDateString('ru-RU');

    if (!schedules[userId]) {
        bot.sendMessage(chatId, '📝 На сегодня занятий нет');
        return;
    }

    const todayLessons = schedules[userId].filter(lesson => lesson.date === today);

    if (todayLessons.length === 0) {
        bot.sendMessage(chatId, '📝 На сегодня занятий нет');
    } else {
        let message = '📅 Занятия на сегодня:\n\n';
        todayLessons.forEach((lesson, index) => {
            message += `${index + 1}. ${lesson.text}\n`;
        });
        bot.sendMessage(chatId, message);
    }
});

// Справка
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, `
📖 Справка по командам:

/add <название> - Добавить занятие
Пример: /add Математика 10:00

/list - Показать все занятия
/delete <номер> - Удалить занятие по номеру
/today - Показать занятия на сегодня
/help - Эта справка

💡 Совет: После команды /list вы увидите номера занятий для удаления
  `);
});

// Обработка неизвестных команд
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Если сообщение не является командой
    if (!text.startsWith('/')) {
        bot.sendMessage(chatId, 'Используйте /help для просмотра доступных команд');
    }
});

console.log('Бот запущен...');