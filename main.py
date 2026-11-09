import os
import re
import time
import json
import urllib.request
import urllib.parse

# Получаем данные из настроек хостинга (Переменные окружения)
TOKEN = os.getenv("BOT_TOKEN") or os.getenv("TOKEN")
GROUP_ID_RAW = os.getenv("GROUP_ID", "-1003852400870")
CHANNEL_ID = os.getenv("CHANNEL_ID", "@ArchangelRP1")

if not TOKEN:
    raise ValueError("Ошибка: Не задан BOT_TOKEN в переменных окружения хостинга!")

GROUP_ID = int(GROUP_ID_RAW)
API_URL = f"https://api.telegram.org/bot{TOKEN}/"

def api_call(method, params=None):
    url = API_URL + method
    data = None
    headers = {}
    if params:
        data = json.dumps(params).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=35) as resp:
        return json.loads(resp.read().decode("utf-8"))

def is_otpravka_command(text):
    if not text:
        return False
    return bool(re.match(r'^/otpravka(@\w+)?(\s|$)', text, flags=re.IGNORECASE))

def clean_command(text):
    if not text:
        return ""
    return re.sub(r'^/otpravka(@\w+)?\s*', '', text, count=1, flags=re.IGNORECASE)

def reply(chat_id, message_id, text):
    api_call("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "reply_to_message_id": message_id
    })

def process_message(msg):
    chat = msg.get("chat", {})
    if chat.get("id") != GROUP_ID:
        return

    msg_id = msg.get("message_id")
    text = msg.get("text")
    caption = msg.get("caption")

    # Если это обычное текстовое сообщение
    if text is not None and is_otpravka_command(text):
        text_to_send = clean_command(text)
        if not text_to_send:
            reply(GROUP_ID, msg_id, "⚠️ Напишите текст после команды /otpravka или прикрепите файл.")
            return
        try:
            api_call("sendMessage", {"chat_id": CHANNEL_ID, "text": text_to_send})
            reply(GROUP_ID, msg_id, "✅ Сообщение отправлено в канал.")
        except Exception as e:
            reply(GROUP_ID, msg_id, f"❌ Ошибка при отправке (проверьте, добавлен ли бот в админы ТГК): {e}")

    # Если это фото, видео, документ, GIF или голосовое с подписью /otpravka
    elif caption is not None and is_otpravka_command(caption):
        caption_to_send = clean_command(caption)
        try:
            api_call("copyMessage", {
                "chat_id": CHANNEL_ID,
                "from_chat_id": GROUP_ID,
                "message_id": msg_id,
                "caption": caption_to_send
            })
            reply(GROUP_ID, msg_id, "✅ Сообщение отправлено в канал.")
        except Exception as e:
            reply(GROUP_ID, msg_id, f"❌ Ошибка при отправке (проверьте, добавлен ли бот в админы ТГК): {e}")

def main():
    print("Бот успешно запущен и ждет сообщений...")
    offset = 0
    while True:
        try:
            res = api_call("getUpdates", {"offset": offset, "timeout": 25})
            for item in res.get("result", []):
                offset = item["update_id"] + 1
                if "message" in item:
                    process_message(item["message"])
        except Exception as e:
            print(f"Ошибка соединения: {e}")
            time.sleep(3)

if __name__ == "__main__":
    main()
