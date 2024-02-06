
// 387442030 - My ID
// 1712121543 - ID Serge Miro

/////////////////////////////////////////////////////////////////////////////////

const TelegramBot = require('node-telegram-bot-api');
const token = "6522058351:AAFbPf4B8MgNVMPvkN6tNDYKk_zYy6se2Cg";
const adminChatId = "387442030";

const bot = new TelegramBot(token, { polling: true });
let forwardingSessions = {};
let applicationStatus = {};


/////////////////////////////////////////////////////////////////////////////////////
////////////////// ФУНКЦИЯ И ДРУГИЕ ОБРАБОТЧИКИ ДЛЯ КОМАНД /////////////////////////
///////////////////////////////////////////////////////////////////////////////////

// bot.sendMessage(chatId, 'Команда не распознана 🤔, будьте внимательнее.');

function toMenu() {
	return {
		 reply_markup: {
			  keyboard: [
					[{ text: 'Подать заявку 📃' }, { text: 'Ответы на вопросы (FAQ) 📖' }],
					[{ text: 'Наш канал 📣' }, { text: 'Наш сайт 🌏' }],
					[{ text: 'Связаться с нами 📱' }]
			  ],
			  resize_keyboard: true
		 }
	};
}

function toFaq() {
	return {
		 text: 'У вас сложные вопросы? 😉 Скачайте наш FAQ [здесь](https://www.france-experience.fr/files/FAQ_France-Experience.pdf)',
		 parse_mode: 'Markdown'
	};
}

///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////


bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text || '';
	const fromId = msg.from.id.toString();

	// Если сообщение является командой '/start'
	if (text && text.toLowerCase() === '/start') {
		if (fromId === adminChatId) {
			bot.sendMessage(chatId, 'Вы являетесь администратором данного чат-бота. Вам недоступны функции пользователя 😉');
		} else {
			bot.sendMessage(chatId, 'Выберите одну из опций:', toMenu());
		}
	} else if (text === 'Связаться с нами 📱') {
		// Если пользователь выбрал опцию связи
		bot.sendMessage(chatId, 'Вы уже изучили наш FAQ 📔 ? В нём вы найдете ответы на многие вопросы. [⬇️](https://www.france-experience.fr/files/FAQ_France-Experience.pdf)', {
			parse_mode: 'Markdown',
			reply_markup: {
				keyboard: [
					[{ text: 'Написать нам ✍️' }],
					[{ text: 'Назад ⬅️' }]
				],
				resize_keyboard: true,
				one_time_keyboard: true
			}
		});
	} else if (text === 'Написать нам ✍️') {
		// Если пользователь хочет написать администратору
		forwardingSessions[chatId] = adminChatId;
		bot.sendMessage(chatId, 'Наш оператор ответит на ваше сообщение в ближайшее время. Пожалуйста, напишите ваш вопрос.', {
			reply_markup: {
				keyboard: [[{ text: 'Покинуть чат 🚪' }]],
				resize_keyboard: true,
				one_time_keyboard: true,
			}
		});
	}	else if (text === 'Назад ⬅️') { // Кнопка "НАЗАД" для раздела 
			// Возврат в основное меню без отправки уведомления администратору
			bot.sendMessage(chatId, 'Вы вернулись в основное меню:', toMenu());
			return; // Прекращаем дальнейшую обработку этого сообщения
		
	} else if (text === 'Покинуть чат 🚪') {
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
	} else if (text === 'Подать заявку 📃' && fromId !== adminChatId) {
		applicationStatus[chatId] = 'awaiting_application';
		let applicationInstructions = "Пожалуйста, предоставьте информацию о себе чтобы мы смогли обработать вашу заявку 💻 :\n\n" +
			"_Ваше имя и фамилия :_\n" +
			"_Дата рождения :_\n" +
			"_Страна :_\n" +
			"_Город :_\n" +
			"_Комментарий (вопрос) :_";
		const options = {
			parse_mode: 'Markdown',
			reply_markup: {
				keyboard: [
					[{ text: 'Назад ⬅️' }]
				],
				resize_keyboard: true,
				one_time_keyboard: false
			}
		};
		bot.sendMessage(chatId, applicationInstructions, options);
	}
	// Если администратор отвечает пользователю и активируется сессия чата
	else if (fromId === adminChatId && forwardingSessions[adminChatId]) {
		const session = forwardingSessions[adminChatId];
		if (session.awaitingReply || session.awaitingRestore) {
			 const userChatId = session.userChatId;
			 // Отправляем сообщение от админа пользователю и активируем чат
			 bot.sendMessage(userChatId, text, {
				  reply_markup: session.awaitingRestore ? {
						keyboard: [[{ text: 'Покинуть чат 🚪' }]],
						resize_keyboard: true,
						one_time_keyboard: true,
				  } : undefined
			 }).then(() => {
				  // Обновляем сессии после отправки сообщения
				  forwardingSessions[userChatId] = adminChatId;
				  delete forwardingSessions[adminChatId];
			 });
		}
  
} else if (forwardingSessions[chatId]) {
		// Убедитесь, что сообщение перенаправляется администратору
		bot.sendMessage(forwardingSessions[chatId], `Сообщение от ${msg.from.first_name || 'пользователя'}: ${text}`, {
		// bot.sendMessage(adminChatId, `ЗАЯВКА от ${msg.from.username || msg.from.first_name}: \n\n${text}`, {
			reply_markup: {
				inline_keyboard: [
					[{ text: 'Ответить ➡️', callback_data: `reply_${chatId}` }]
				]
			}
		});
  } else if (text === 'Назад ⬅️' && applicationStatus[chatId] === 'awaiting_application') {
		// Сброс статуса подачи заявки
		applicationStatus[chatId] = null;
		// Возврат в основное меню без отправки уведомления администратору
		bot.sendMessage(chatId, 'Вы вернулись в основное меню:', toMenu());
		return; // Прекращаем дальнейшую обработку этого сообщения
	}
	else if (applicationStatus[chatId] === 'awaiting_application' && fromId !== adminChatId) {
		// Обработка заявки, если сообщение не является "Назад ⬅️"
		applicationStatus[chatId] = null; // Сбрасываем статус заявки
		bot.sendMessage(chatId, 'Ваша заявка успешно отправлена 👍 France Experience свяжется с вами очень скоро 📨');
		bot.sendMessage(adminChatId, `ЗАЯВКА от ${msg.from.username || msg.from.first_name}: \n\n${text}`, {
			reply_markup: {
				inline_keyboard: [
					[{ text: 'Ответить ➡️', callback_data: `reply_${chatId}` }]
				]
			}
		});
		// Возврат в основное меню после отправки заявки
		bot.sendMessage(chatId, 'Вы вернулись в основное меню:', toMenu());
	} else if (forwardingSessions[chatId] && fromId !== adminChatId) {
		let userName = msg.from.username || `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
		bot.sendMessage(adminChatId, `${userName}:\n${text}`, {
			 reply_markup: {
				  inline_keyboard: [[{ text: 'Ответить ➡️', callback_data: `reply_${chatId}` }]]
			 }
		});
  } else if (text === 'Наш канал 📣') {
		text = 'Подписывайтесь на наш канал! [Там много интересного:](https://t.me/frexperience)';
		bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
		return;
	} else if (text === 'Наш сайт 🌏') {
		text = 'Посетите наш сайт [👇](https://france-experience.fr)';
		bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
		return;
	} else if (text === 'Ответы на вопросы (FAQ) 📖') {
		const faqMessage = toFaq();
		bot.sendMessage(chatId, faqMessage.text, { parse_mode: faqMessage.parse_mode });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

bot.on('callback_query', (callbackQuery) => {
	const adminId = callbackQuery.from.id.toString();
	const data = callbackQuery.data;
	const chatId = callbackQuery.message.chat.id; // ID чата администратора

	if (data.startsWith('reply_') && adminId === adminChatId) {
		 const userChatId = data.split('_')[1]; // ID пользователя
		 // Устанавливаем сессию для ответа админа пользователю
		 forwardingSessions[adminChatId] = { userChatId, awaitingReply: true };
		 bot.sendMessage(adminChatId, 'Введите сообщение для ответа:');
	} else if (data.startsWith('restore_') && adminId === adminChatId) {
		 const userChatId = data.split('_')[1];
		 // Помечаем сессию как ожидающую восстановления
		 forwardingSessions[adminChatId] = { userChatId, awaitingRestore: true };
		 // Убрали уведомление о восстановлении чата, чат восстановится после ответа админа
		 bot.sendMessage(adminChatId, 'Ответьте на сообщение для восстановления чата.');
	}
});




// bot.on('callback_query', (callbackQuery) => {
// 	const adminId = callbackQuery.from.id.toString();
// 	const data = callbackQuery.data;
// 	const chatId = callbackQuery.message.chat.id;

// 	if (data.startsWith('reply_') && adminId === adminChatId) {
// 		const userChatId = data.split('_')[1];
// 		//Сохраняем состояние сессии, но не активируем чат сразу
// 		forwardingSessions[adminChatId] = { userChatId, awaitingReply: true };
// 		bot.sendMessage(adminChatId, 'Введите сообщение для ответа:');
// 	} else if (data.startsWith('restore_') && adminId === adminChatId) {
// 		 const userChatId = data.split('_')[1];
// 		 forwardingSessions[userChatId] = adminChatId;
// 		 forwardingSessions[adminChatId] = userChatId;
// 		 bot.sendMessage(adminChatId, 'Чат восстановлен. Можете отправить сообщение.');
// 		 bot.sendMessage(userChatId, 'Чат восстановлен.', {
// 			  reply_markup: {
// 					keyboard: [[{ text: 'Покинуть чат 🚪' }]],
// 					resize_keyboard: true,
// 					one_time_keyboard: true,
// 			  }
// 		 });
// 	}
// });

