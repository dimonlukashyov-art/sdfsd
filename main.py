import asyncio
import logging
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

# Данные бота drray rpbot
BOT_TOKEN = "8797648192:AAH0hZ-YCbJNbpd3fUjEGnpLyOiYh4lxF3c"
GROUP_ID = -1004321575272

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


# 0. Команда /id в группе
@dp.message(Command("id"))
async def get_chat_id(message: Message):
    await message.answer(
        f"ID этого чата: `{message.chat.id}`",
        parse_mode="Markdown"
    )


# 1. Приветствие и анкета при старте
@dp.message(CommandStart(), F.chat.type == "private")
async def cmd_start(message: Message):
    user = message.from_user
    username = f"@{user.username}" if user.username else "скрыт"

    # Текст анкеты для клиента
    form_text = (
        "Здравствуйте! Вы обратились в **drray rpbot**.\n\n"
        "Пожалуйста, заполните анкету и отправьте ответы ответным сообщением:\n\n"
        "**Анкета**\n"
        "1. Возраст:\n"
        "2. Где узнали о проекте:\n"
        "3. Был ли опыт в этой сфере:\n"
        "4. Ознакомились ли вы с правилами:\n"
        "5. Что собираетесь делать на проекте:"
    )
    await message.answer(form_text, parse_mode="Markdown")

    # Уведомление в вашу группу о новом клиенте
    group_alert = (
        f"🔔 **Клиент запустил бота (drray rpbot)!**\n"
        f"👤 Имя: {user.full_name}\n"
        f"🔗 Юзернейм: {username}\n"
        f"🆔 ID: `{user.id}`"
    )
    await bot.send_message(GROUP_ID, group_alert, parse_mode="Markdown")


# 2. Пересылка сообщений и ответов на анкету от клиента в группу
@dp.message(F.chat.type == "private")
async def forward_to_group(message: Message):
    user = message.from_user
    username = f"@{user.username}" if user.username else "без юзернейма"

    # Карточка клиента для группы
    header = f"📩 **Сообщение от:** {user.full_name} ({username})\n🆔 ID: `{user.id}`"
    await bot.send_message(GROUP_ID, header, parse_mode="Markdown")

    # Пересылка текста анкеты или вложенных файлов
    await message.forward(GROUP_ID)

    # Подтверждение клиенту
    await message.answer("✅ Ваша анкета принята и отправлена администрации!")


# 3. Ответ клиенту прямо из группы через Reply (Ответить)
@dp.message(F.chat.id == GROUP_ID, F.reply_to_message)
async def reply_from_group(message: Message):
    reply = message.reply_to_message
    client_id = None

    if reply.forward_from:
        client_id = reply.forward_from.id
    elif reply.text and "🆔 ID:" in reply.text:
        try:
            client_id = int(reply.text.split("🆔 ID:")[1].strip().split()[0])
        except ValueError:
            pass

    if client_id:
        try:
            await message.copy_to(client_id)
            await message.reply("📤 Ответ отправлен клиенту.")
        except Exception as e:
            await message.reply(f"❌ Ошибка отправки: {e}")
    else:
        if reply.from_user.id == bot.id:
            await message.reply(
                "⚠️ Профиль клиента скрыт настройками приватности.\n"
                "Сделайте **Ответить (Reply)** на сообщение выше с `🆔 ID: ...`",
                parse_mode="Markdown"
            )


async def main():
    logging.basicConfig(level=logging.INFO)
    print("Бот drray rpbot запущен с обновленной анкетой!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())