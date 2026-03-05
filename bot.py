#!/usr/bin/env python3
# bot.py - УПРОЩЕННАЯ ВЕРСИЯ

import asyncio
import logging
import os
import subprocess
import threading
from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import Message

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Токен
TOKEN = "8714739961:AAG9l-7-G7duRNKuNtarP7rTchfvZQFCMxo"
bot = Bot(token=TOKEN)
dp = Dispatcher()

# Простой обработчик
@dp.message(Command("start"))
async def start(message: Message):
    await message.answer("✅ БОТ РАБОТАЕТ! Отправь /help")

@dp.message(Command("help"))
async def help(message: Message):
    await message.answer("Доступные команды:\n/start - приветствие\n/help - помощь")

@dp.message()
async def echo(message: Message):
    await message.answer(f"Вы написали: {message.text}")

# Запуск мини-приложения
def run_mini_app():
    try:
        os.chdir("telegram-cake-miniapp")
        subprocess.run(["npm", "start"])
    except Exception as e:
        logger.error(f"Ошибка мини-приложения: {e}")

async def main():
    logger.info("=" * 50)
    logger.info("ЗАПУСК БОТА")
    logger.info("=" * 50)
    
    # Удаляем вебхук
    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("✅ Вебхук удален")
    
    # Запускаем бота
    logger.info("🚀 Бот запущен")
    await dp.start_polling(bot)

if __name__ == "__main__":
    # Запускаем мини-приложение в фоне
    threading.Thread(target=run_mini_app, daemon=True).start()
    
    # Запускаем бота
    asyncio.run(main())
