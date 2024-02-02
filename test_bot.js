
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
				[{ text: 'Подать заявку 📃' }],
				[{ text: 'Наш канал 📣' }],
				[{ text: 'Ответы на вопросы (FAQ) 📖' }],
				[{ text: 'Связаться с нами 📱' }]
			],
			resize_keyboard: true,
			one_time_keyboard: false
		}
	};
}

function toFaq() {
	// Функция возвращает текст FAQ
	const text = 'У вас сложные вопросы ? 😉 Скачайте наш FAQ [⬇️](https://www.france-experience.fr/files/FAQ_France-Experience.pdf)';
	return {
	  text: text,
	  parse_mode: 'Markdown'
	};
 }

// bot.sendMessage(chatId, 'Команда не распознана 🤔, будьте внимательнее.');

///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	const fromId = msg.from.id.toString();

	// Если сообщение является командой '/start'
	if (msg.text && msg.text.toLowerCase() === '/start') {
		if (fromId === adminChatId) {
			 bot.sendMessage(chatId, 'Вы являетесь администратором данного чат-бота. Вам недоступны функции пользователя 😉');
		} else {
			 bot.sendMessage(chatId, 'Выберите одну из опций:', toMenu());
		}
	} else if (msg.text === 'Связаться с нами 📱') {
		 // Если пользователь выбрал опцию связи
		 bot.sendMessage(chatId, 'Вы уже изучили наш FAQ? В нём вы найдете ответы на многие вопросы.', {
			  parse_mode: 'Markdown',
			  reply_markup: {
					keyboard: [
						 [{ text: 'Написать нам' }],
						 [{ text: 'Назад' }]
					],
					resize_keyboard: true,
					one_time_keyboard: true
			  }
		 });
	} else if (msg.text === 'Написать нам') {
		 // Если пользователь хочет написать администратору
		 forwardingSessions[chatId] = adminChatId;
		 bot.sendMessage(chatId, 'Наш оператор ответит на ваше сообщение в ближайшее время. Пожалуйста, напишите ваш вопрос.', {
			  reply_markup: {
					keyboard: [[{ text: 'Покинуть чат' }]],
					resize_keyboard: true,
					one_time_keyboard: true,
			  }
		 });
	} else if (msg.text === 'Покинуть чат') {
		// Если пользователь выбрал покинуть чат
		let userName = msg.from.username || `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
		bot.sendMessage(adminChatId, `${userName} покинул(a) чат`, {
			 reply_markup: {
				  inline_keyboard: [
						[{ text: 'Восстановить чат 🔄', callback_data: `restore_${chatId}` }]
				  ]
			 }
		});
		delete forwardingSessions[chatId];
		bot.sendMessage(chatId, 'Вы покинули чат.', toMenu());
	} else if (forwardingSessions[adminChatId] && fromId === adminChatId) {
		 // Если администратор отвечает пользователю
		 const userChatId = forwardingSessions[adminChatId];
		 bot.sendMessage(userChatId, msg.text);
		 // Удалить следующую строку, если администратор может отправлять несколько сообщений
		 // delete forwardingSessions[adminChatId];
	} else if (forwardingSessions[chatId] && fromId !== adminChatId) {
		 // Если это сообщение от пользователя к администратору
		 let userName = msg.from.username || `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
		 bot.sendMessage(adminChatId, `${userName}:\n${msg.text}`, {
			  reply_markup: {
					inline_keyboard: [[{ text: 'Ответить ➡️', callback_data: `reply_${chatId}` }]]
			  }
		 });
	} else {
		 // Обработка остальных сообщений
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
					[{ text: 'Ответить ➡️', callback_data: `reply_${chatId}` }]
				]
			}
		});
		applicationStatus[chatId] = null;
		return;
	}

	// if (text === 'Подать заявку 📃') {
	// 	applicationStatus[chatId] = 'awaiting_application';
	// 	let applicationInstructions = `Отправьте нам ваши данные и мы свяжемся с вами в ближайшее время.\n\n` +
	// 		`_Ваше имя и фамилия :_\n` +
	// 		`_Дата рождения :_\n` +
	// 		`_Страна :_\n` +
	// 		`_Город :_\n` +
	// 		`_Комментарий (вопрос) :_`;
	// 	const options = {
	// 		parse_mode: 'Markdown',
	// 		reply_markup: {
	// 			keyboard: [
	// 				[{ text: 'Назад' }]
	// 			],
	// 			resize_keyboard: true,
	// 			one_time_keyboard: false
	// 		}
	// 	};
	// 	bot.sendMessage(chatId, applicationInstructions, options);
	// 	return;
	// }

	if (text === 'Наш канал 📣') {
		text = 'Подписывайтесь на наш канал! [Там много интересного:](https://t.me/frexperience)';
		bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
		return;
	}
	if (text === 'Ответы на вопросы (FAQ) 📖') {
		const faqMessage = toFaq();
		bot.sendMessage(chatId, faqMessage.text, { parse_mode: faqMessage.parse_mode });
	 }

	// bot.sendMessage(chatId, 'Выберите одну из опций:', toMenu());



	// Если команда не распознана, возвращаем пользователя к основному меню
	// bot.sendMessage(chatId, 'Команда не распознана 🤔, будьте внимательнее.');
}



//////////////////////////////////////////////////////////////////////////////////////////////
bot.on('callback_query', (callbackQuery) => {
	const adminId = callbackQuery.from.id.toString();
	const data = callbackQuery.data;
	const chatId = callbackQuery.message.chat.id;

	if (data.startsWith('reply_')) {
		 if (adminId === adminChatId) {
			  const userChatId = data.split('_')[1];
			  forwardingSessions[adminChatId] = userChatId;
			  bot.sendMessage(adminChatId, 'Введите сообщение для ответа:');
		 }
	} else if (data.startsWith('restore_')) {
		 if (adminId === adminChatId) {
			  const userChatId = data.split('_')[1];
			  forwardingSessions[userChatId] = adminChatId;
			  forwardingSessions[adminChatId] = userChatId;
			  bot.sendMessage(adminChatId, 'Чат восстановлен. Можете отправить сообщение.');
			  bot.sendMessage(userChatId, 'Чат восстановлен.', {
					reply_markup: {
						 keyboard: [[{ text: 'Покинуть чат' }]],
						 resize_keyboard: true,
						 one_time_keyboard: true,
					}
			  });
		 }
	}
});

