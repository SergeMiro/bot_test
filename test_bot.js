

// 387442030 - My ID
// 1712121543 - ID Serge Miro

/////////////////////////////////////////////////////////////////////////////////

const TelegramBot = require('node-telegram-bot-api');

const token = "6522058351:AAFbPf4B8MgNVMPvkN6tNDYKk_zYy6se2Cg";
const adminChatId = "387442030";

const bot = new TelegramBot(token, { polling: true });
let forwardingSessions = {};
// Глобальная переменная для отслеживания статуса отправки заявки
let applicationStatus = {};




///////////////////////////////////////////////////////////////////////////////////
////////////////// ФУНКЦИЯ И ДРУГИЕ ОБРАБОТЧИКИ ДЛЯ КОМАНД /////////////////////////
///////////////////////////////////////////////////////////////////////////////////

function toMenu() { //функция возвращает основное меню
	return {
		reply_markup: {
			keyboard: [
				[{ text: 'Связаться с нами 📱' }],
				[{ text: 'Подать заявку 📃' }],
				[{ text: 'Наш канал 📣' }]
			],
			resize_keyboard: true,
			one_time_keyboard: false
		}
	};
}



///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

bot.on('message', (msg) => { //новый экземпляр бота из библиотеки
	const chatId = msg.chat.id;


	if (msg.text && msg.text.toLowerCase() === '/start') {
		bot.sendMessage(chatId, 'Выберите одну из опций :', toMenu());
		return;
	}


	if (chatId.toString() === adminChatId) {
		const adminMessage = msg.text;
		const userChatId = forwardingSessions[chatId];

		if (userChatId) {
			bot.sendMessage(userChatId, adminMessage, {
				reply_markup: {
					keyboard: [[{ text: 'Покинуть чат' }]],
					resize_keyboard: true,
					one_time_keyboard: false,
				}
			});
			return;
		}
	}

	if (msg.text === 'Связаться с нами 📱') {
		forwardingSessions[chatId] = adminChatId;
		bot.sendMessage(chatId, 'Наш оператор ответит на ваше сообщение в ближайшее время. Пожалуйста, напишите ваш вопрос.', {
			reply_markup: {
				keyboard: [[{ text: 'Покинуть чат' }]],
				resize_keyboard: true,
				one_time_keyboard: true,
			}
		});
	} else if (msg.text === 'Покинуть чат') {
		let userName = msg.from.username || `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
		bot.sendMessage(adminChatId, `${userName} покинул(a) чат`, {
			reply_markup: {
				inline_keyboard: [
					[{ text: 'Восстановить чат', callback_data: `restore_${chatId}` }]
				]
			}
		});

		delete forwardingSessions[chatId];
		bot.sendMessage(chatId, 'Вы покинули чат.', {
			reply_markup: {
				keyboard: [
					[{ text: 'Связаться с нами 📱' }],
					[{ text: 'Подать заявку 📃' }],
					[{ text: 'Наш канал 📣' }],
				],
				resize_keyboard: true,
				one_time_keyboard: false,
			}
		});
	} else if (forwardingSessions[chatId]) {
		let userName = msg.from.username || `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
		bot.sendMessage(adminChatId, `${userName}:\n${msg.text}`, {
			reply_markup: {
				inline_keyboard: [
					[{ text: 'Ответить', callback_data: `reply_${chatId}` }]
				]
			}
		});
	} else {
		handleRegularMessages(msg, chatId);
	}
});

//////////////////////////////////////////////////////////////////////////////////////////////

// Функция для обработки стандартных сообщений
function handleRegularMessages(msg, chatId) {
	let text = msg.text;

	// Обработка команды "Назад"
	if (text === 'Назад') {
		// Сброс статуса подачи заявки, если он активен
		if (applicationStatus[chatId]) {
			applicationStatus[chatId] = null;
		}

		// Очистка сессии пересылки, если она активна
		if (forwardingSessions[chatId]) {
			delete forwardingSessions[chatId];
		}

		// Возвращение пользователя к основному меню
		bot.sendMessage(chatId, 'Выберите одну из опций:', toMenu());
		return;
	}

	// Проверяем, находится ли пользователь в процессе подачи заявки
	if (applicationStatus[chatId] === 'awaiting_application') {
		// Обработка текста заявки
		bot.sendMessage(chatId, 'Ваша заявка успешно отправлена! France Experience свяжется с вами очень скоро.');
		bot.sendMessage(adminChatId, `ЗАЯВКА от ${msg.from.username || msg.from.first_name}: \n\n${text}`, {
			reply_markup: {
				inline_keyboard: [
					[{ text: 'Ответить', callback_data: `reply_${chatId}` }]
				]
			}
		});
		applicationStatus[chatId] = null;
		return;
	}

	if (text === 'Подать заявку 📃') {
		applicationStatus[chatId] = 'awaiting_application';
		let applicationInstructions = `Отправьте нам ваши данные и мы свяжемся с вами в ближайшее время.\n\n` +
			`_Ваше имя и фамилия :_\n` +
			`_Дата рождения :_\n` +
			`_Страна :_\n` +
			`_Город :_\n` +
			`_Комментарий (вопрос) :_`;
		const options = {
			parse_mode: 'Markdown',
			reply_markup: {
				keyboard: [
					[{ text: 'Назад' }]
				],
				resize_keyboard: true,
				one_time_keyboard: false
			}
		};
		bot.sendMessage(chatId, applicationInstructions, options);
		return;
	}

	if (text === 'Наш канал 📣') {
		text = 'Подписывайтесь на наш канал! [Там много интересного:](https://t.me/frexperience)';
		bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
		return;
	}

	// Если команда не распознана, возвращаем пользователя к основному меню
	const options = toMenu();
	bot.sendMessage(chatId, 'Выберите одну из опций:', options);
}



//////////////////////////////////////////////////////////////////////////////////////////////

bot.on('callback_query', (callbackQuery) => {
	const adminId = callbackQuery.from.id.toString();
	const data = callbackQuery.data;

	if (data.startsWith('reply_') && adminId === adminChatId) {
		const userChatId = data.split('_')[1];
		forwardingSessions[adminChatId] = userChatId;
		bot.sendMessage(adminChatId, 'Введите сообщение для ответа:');
	}
	else if (data.startsWith('restore_') && adminId === adminChatId) {
		const userChatId = data.split('_')[1];
		forwardingSessions[userChatId] = adminChatId;
		forwardingSessions[adminChatId] = userChatId;
		bot.sendMessage(adminChatId, 'Чат восстановлен. Можете отправить сообщение.');
	}
});

