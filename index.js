'use strict';
require('dotenv').config()
const ViberBot = require('viber-bot').Bot;
const TelegramBot = require('node-telegram-bot-api')
const {VK} = require('vk-io')
const BotEvents = require('viber-bot').Events;
const express = require('express')
const TextMessage = require('viber-bot').Message.Text;
const viberApi = process.env.VIBER_API

const isDev = false

// Запускаем сервер
const port = process.env.PORT || 3000;
const app = express()

// ID чатов
const vkChatId = isDev ? process.env.TEST_VK_CHAT_ID : process.env.VK_CHAT_ID
const tgChatId = isDev ? process.env.TEST_TG_CHAT_ID : process.env.TELEGRAM_CHAT_ID

// Создаем бота в вайбере
const VbBot = new ViberBot({
    authToken: viberApi,
    name: "11 класс",
    avatar: "https://i.pinimg.com/564x/6c/6c/d4/6c6cd4e8f2c128cdcfed6769103bf8be.jpg" // It is recommended to be 720x720, and no more than 100kb.
})

// Создаем тг бота
const TgBot = new TelegramBot(process.env.TELEGRAM_API, {polling: true});

// Создаем вк бота
const VkBot = new VK({token: process.env.VKONTAKTE_API})

// Функция отправления сообщения
const sendVkMsg = async (msg) => {
    await VkBot.api.messages.send({
        peer_id: vkChatId,
        message: msg,
        random_id: Date.now() + Math.random()
    })
}

app.use("/viber/webhook", VbBot.middleware())


VbBot.on(BotEvents.MESSAGE_RECEIVED, async (msg, res) => {
    const user = await VbBot.getUserDetails(res.userProfile)
    if(msg.stickerId){
        res.send(new TextMessage("Данный тип сообщений не поддерживается другими мессенджерамии"))
        return
    }

    if (msg.text === null) {
        const photo = msg?.thumbnail
        await TgBot.sendPhoto(tgChatId, photo)
        const vkPhoto = await VkBot.upload.messagePhoto({
            peer_id: vkChatId,
            source: {
                timeout: 1e3 * 60,
                values: [
                    {
                        value: photo
                    },

                ]
            }
        });

        await VkBot.api.messages.send({
            peer_id: vkChatId,
            random_id: Date.now() + Math.random(),
            attachment: vkPhoto
        })

        return;
    }

    const newMsg = `От: ${user.name.toLowerCase() === 'subscriber' ? 'Неизвестно' : user.name}\n${msg.text}`

    await sendVkMsg(newMsg)

    await TgBot.sendMessage(tgChatId, newMsg)
})

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Application running on port: ${port}`);
    VbBot.setWebhook(`${process.env.EXPOSE_URL}/viber/webhook`).catch(error => {
        console.log('Can not set webhook on following server. Is it running?')
        console.error(error)
        process.exit(1)
    });
});