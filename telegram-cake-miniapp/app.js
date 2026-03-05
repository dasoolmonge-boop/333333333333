// app.js - ОБЪЕДИНЕННЫЙ ЗАПУСКАТОР (мини-приложение + бот)

// app.js - ОБЪЕДИНЕННЫЙ ЗАПУСКАТОР (мини-приложение + бот)
// Версия с автоматическим поиском Python

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn, spawnSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = "8714739961:AAG9l-7-G7duRNKuNtarP7rTchfvZQFCMxo";
const ADMIN_ID = 1066867845;

// ============================================
// ДИАГНОСТИКА ОКРУЖЕНИЯ
// ============================================

console.log('='.repeat(60));
console.log('🔍 ДИАГНОСТИКА ОКРУЖЕНИЯ');
console.log('='.repeat(60));

// Информация о системе
console.log(`🖥️  PLATFORM: ${process.platform}`);
console.log(`📂 CURRENT DIR: ${process.cwd()}`);
console.log(`🔧 NODE VERSION: ${process.version}`);
console.log(`📋 PATH: ${process.env.PATH}`);

// Проверка наличия Python
console.log('\n🔍 ПОИСК PYTHON:');

const pythonVariants = [
    { cmd: 'python3', args: ['--version'] },
    { cmd: 'python', args: ['--version'] },
    { cmd: 'python3.11', args: ['--version'] },
    { cmd: 'python3.10', args: ['--version'] },
    { cmd: 'python3.9', args: ['--version'] },
    { cmd: '/usr/bin/python3', args: ['--version'] },
    { cmd: '/usr/local/bin/python3', args: ['--version'] },
    { cmd: '/usr/bin/python', args: ['--version'] },
    { cmd: '/usr/local/bin/python', args: ['--version'] }
];

let PYTHON_CMD = null;
let pythonVersion = null;

for (const variant of pythonVariants) {
    try {
        console.log(`   Проверка: ${variant.cmd}...`);
        const result = spawnSync(variant.cmd, variant.args, { 
            encoding: 'utf8',
            timeout: 2000
        });
        
        if (result.status === 0) {
            PYTHON_CMD = variant.cmd;
            pythonVersion = result.stdout || result.stderr;
            console.log(`   ✅ НАЙДЕН: ${variant.cmd} - ${pythonVersion.trim()}`);
            break;
        }
    } catch (e) {
        // Игнорируем ошибки
    }
}

if (!PYTHON_CMD) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА: Python не найден!');
    console.error('   Бот не может быть запущен.');
    console.error('   Попробуйте установить Python или обратитесь в поддержку BotHost.');
} else {
    console.log(`\n✅ Будет использован Python: ${PYTHON_CMD}`);
}

console.log('='.repeat(60));

// ============================================
// ЗАПУСК TELEGRAM БОТА (если Python найден)
// ============================================

let botProcess = null;

if (PYTHON_CMD) {
    console.log('\n🤖 Запуск Telegram бота...');
    
    // Определяем путь к боту
    const botPaths = [
        path.join(__dirname, '..', 'bot.py'),                    // ../bot.py
        path.join(__dirname, '..', 'Крутой тортик', 'bot.py'),   // ../Крутой тортик/bot.py
        path.join(__dirname, '..', 'simple_bot.py'),             // ../simple_bot.py
        path.join(__dirname, '..', 'main.py'),                    // ../main.py
        path.join(__dirname, '..', 'start.py')                    // ../start.py
    ];

    let botPath = null;
    for (const p of botPaths) {
        if (fs.existsSync(p)) {
            botPath = p;
            console.log(`✅ Найден файл бота: ${botPath}`);
            break;
        }
    }

    if (botPath) {
        // Запускаем бота в отдельном процессе
        botProcess = spawn(PYTHON_CMD, [botPath], {
            stdio: 'pipe',
            shell: true,
            env: { 
                ...process.env, 
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1'
            }
        });

        // Логируем вывод бота
        botProcess.stdout.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            lines.forEach(line => {
                if (line) console.log(`[BOT] ${line}`);
            });
        });

        botProcess.stderr.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            lines.forEach(line => {
                if (line) console.error(`[BOT-ERROR] ${line}`);
            });
        });

        botProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Процесс бота завершен (код: ${code})`);
            } else {
                console.log(`⚠️ Процесс бота завершился с кодом ${code}`);
            }
        });

        botProcess.on('error', (err) => {
            console.error(`❌ Ошибка запуска бота: ${err.message}`);
        });

        console.log(`✅ Бот запущен (PID: ${botProcess.pid})`);
    } else {
        console.error('❌ Файл бота не найден! Искал в:');
        botPaths.forEach(p => console.error(`   - ${p}`));
    }
}

// ============================================
// MIME-типы для статических файлов
// ============================================

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// ============================================
// HTTP СЕРВЕР ДЛЯ МИНИ-ПРИЛОЖЕНИЯ
// ============================================

const server = http.createServer((req, res) => {
    console.log(`[MINI-APP] ${req.method} ${req.url}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API endpoint для отправки заказа админу
    if (req.url === '/api/send-order' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const orderData = JSON.parse(body);
                sendOrderToAdmin(orderData, res);
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // API endpoint для получения тортов
    if (req.url === '/api/cakes' && req.method === 'GET') {
        const cakes = [
            {
                id: 1,
                name: 'Медовик',
                price: 2500,
                weight: 1.5,
                description: 'Классический медовый торт с нежным кремом',
                photo: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'
            },
            {
                id: 2,
                name: 'Наполеон',
                price: 2800,
                weight: 1.8,
                description: 'Хрустящие коржи с заварным кремом',
                photo: 'https://images.unsplash.com/photo-1464305795233-6e7c1d10f1d8?w=400'
            },
            {
                id: 3,
                name: 'Красный бархат',
                price: 3200,
                weight: 2.0,
                description: 'Красные коржи с сливочно-сырным кремом',
                photo: 'https://images.unsplash.com/photo-1586788224331-947f68671cf1?w=400'
            },
            {
                id: 4,
                name: 'Птичье молоко',
                price: 2700,
                weight: 1.6,
                description: 'Нежное суфле на тонких коржах',
                photo: 'https://images.unsplash.com/photo-1519915025057-0b45c91fde85?w=400'
            },
            {
                id: 5,
                name: 'Прага',
                price: 2900,
                weight: 1.7,
                description: 'Шоколадный торт с пралине',
                photo: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a6a?w=400'
            }
        ];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cakes));
        return;
    }

    // Раздача статических файлов
    let url = req.url;
    if (url === '/' || url === '') {
        url = '/index.html';
    }

    const filePath = path.join(__dirname, 'public', url);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'text/plain';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Файл не найден');
            } else {
                res.writeHead(500);
                res.end(`Ошибка сервера: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// ============================================
// ОТПРАВКА ЗАКАЗА АДМИНИСТРАТОРУ
// ============================================

function sendOrderToAdmin(orderData, res) {
    const { name, phone, address, deliveryDate, deliveryTime, wish, cart, totalPrice, userId, username } = orderData;

    const cakesList = cart.map(item =>
        `🍰 ${item.name} - ${item.price} ₽ (${item.weight} кг)`
    ).join('\n');

    const message =
        `📩 **НОВЫЙ ЗАКАЗ ИЗ MINI APP**\n\n` +
        `🍰 **Торты:**\n${cakesList}\n` +
        `💰 **Итого:** ${totalPrice} ₽\n\n` +
        `👤 **Имя:** ${name}\n` +
        `🆔 **Username:** ${username ? '@' + username : 'нет'}\n` +
        `📱 **Телефон:** ${phone}\n` +
        `📍 **Адрес:** ${address}\n` +
        `📅 **Дата доставки:** ${deliveryDate}\n` +
        `⏰ **Время доставки:** ${deliveryTime}\n` +
        `📝 **Пожелания:** ${wish || 'Без пожеланий'}\n` +
        `🆔 **User ID:** ${userId}\n` +
        `📅 **Дата заказа:** ${new Date().toLocaleString('ru-RU')}`;

    const postData = JSON.stringify({
        chat_id: ADMIN_ID,
        text: message,
        parse_mode: 'Markdown'
    });

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Заказ отправлен администратору' }));
        });
    });

    req.on('error', (error) => {
        console.error('Ошибка отправки:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ошибка отправки заказа' }));
    });

    req.write(postData);
    req.end();
}

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🍰 МИНИ-ПРИЛОЖЕНИЕ ЗАПУЩЕНО');
    console.log('='.repeat(60));
    console.log(`✅ Mini App сервер запущен на порту ${PORT}`);
    console.log(`📁 Раздаем файлы из: ${path.join(__dirname, 'public')}`);
    
    if (PYTHON_CMD) {
        console.log(`✅ Python найден: ${PYTHON_CMD}`);
        if (botProcess) {
            console.log(`✅ Бот запущен (PID: ${botProcess.pid})`);
        }
    } else {
        console.log('❌ Python НЕ НАЙДЕН! Бот не запущен.');
    }
    
    console.log('='.repeat(60) + '\n');
});

// ============================================
// ОБРАБОТКА ЗАВЕРШЕНИЯ
// ============================================

function shutdown() {
    console.log('\n🛑 Получен сигнал завершения...');
    
    if (botProcess) {
        console.log('🛑 Останавливаем бота...');
        botProcess.kill();
    }
    
    console.log('🛑 Останавливаем сервер...');
    server.close(() => {
        console.log('✅ Все процессы завершены');
        process.exit(0);
    });
    
    // Принудительное завершение через 5 секунд
    setTimeout(() => {
        console.log('⚠️ Принудительное завершение');
        process.exit(1);
    }, 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

