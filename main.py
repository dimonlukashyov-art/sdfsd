import os
import re
import sys
import subprocess

# Автоматическая установка библиотеки, если её нет в образе
try:
    import telebot
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyTelegramBotAPI"])
    import telebot

# Получаем данные из переменных окружения хостинга
TOKEN = os.getenv("BOT_TOKEN") or os.getenv("TOKEN")
GROUP_ID_RAW = os.getenv("GROUP_ID")
CHANNEL_ID = os.getenv("CHANNEL_ID")

if not TOKEN or not GROUP_ID_RAW or not CHANNEL_ID:
    raise ValueError("Ошибка: Не заданы переменные окружения BOT_TOKEN, GROUP_ID или CHANNEL_ID!")

GROUP_ID = int(GROUP_ID_RAW)

bot = telebot.TeleBot(TOKEN)

def is_otpravka_command(text):
    if not text:
        return False
    return bool(re.match(r'^/otpravka(@\w+)?(\s|$)', text, flags=re.IGNORECASE))

def clean_command(text):
    if not text:
        return ""
    return re.sub(r'^/otpravka(@\w+)?\s*', '', text, count=1, flags=re.IGNORECASE)

@bot.message_handler(
    func=lambda m: m.chat.id == GROUP_ID and is_otpravka_command(m.text),
    content_types=['text']
)
def handle_text(message):
    text_to_send = clean_command(message.text)
    if not text_to_send:
        bot.reply_to(message, "⚠️ Напишите текст после команды /otpravka или прикрепите файл.")
        return

    try:
        bot.send_message(CHANNEL_ID, text_to_send)
        bot.reply_to(message, "✅ Сообщение отправлено в канал.")
    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка при отправке: {e}")

@bot.message_handler(
    func=lambda m: m.chat.id == GROUP_ID and is_otpravka_command(m.caption),
    content_types=['photo', 'video', 'document', 'audio', 'animation', 'voice']
)
def handle_media(message):
    caption_to_send = clean_command(message.caption)

    try:
        bot.copy_message(
            chat_id=CHANNEL_ID,
            from_chat_id=message.chat.id,
            message_id=message.message_id,
            caption=caption_to_send
        )
        bot.reply_to(message, "✅ Сообщение отправлено в канал.")
    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка при отправке: {e}")

if __name__ == "__main__":
    print("Бот запущен...")
    bot.infinity_polling()
