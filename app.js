const puppeteer = require('puppeteer');
const multer = require('multer');
const forge = require('node-forge');

const login = 'artem_pityov';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB лимит
    },
});

const application = (express, bodyParser, createReadStream, crypto, http) => {
    const app = express()
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        next();
    });

    app.get('/login/', (req, res) => {
        res.end(login)
    })

    app.post(
        '/decypher',
        upload.fields([
            { name: 'key', maxCount: 1 },
            { name: 'secret', maxCount: 1 },
        ]),
        (req, res) => {
            try {
                // Проверяем наличие файлов
                if (!req.files || !req.files.key || !req.files.secret) {
                    return res
                        .status(400)
                        .type('text/plain')
                        .send('Отсутствуют обязательные поля: key и secret');
                }

                const keyFile = req.files.key[0];
                const secretFile = req.files.secret[0];

                // Получаем содержимое приватного ключа
                const privateKeyPem = keyFile.buffer.toString('utf8');

                // Получаем зашифрованные данные
                const encryptedData = secretFile.buffer;

                // Парсим приватный ключ
                const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

                // Расшифровываем данные
                const decrypted = privateKey.decrypt(
                    encryptedData.toString('binary'),
                    'RSA-OAEP'
                );

                // Возвращаем результат как обычную строку
                res.type('text/plain').send(decrypted);
            } catch (error) {
                console.error('Ошибка расшифровки:', error);
                res
                    .status(400)
                    .type('text/plain')
                    .send(`Ошибка расшифровки: ${error.message}`);
            }
        }
    );

    app.get('/test/', async (req, res) => {
        const targetURL = req.query.URL;

        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
        })

        const page = await browser.newPage();
        await page.goto(targetURL, { waitUntil: 'networkidle2' });

        await page.click('#bt');

        await page.waitForFunction(() => {
            const input = document.querySelector('#inp');
            return input.value;
        }, { timeout: 1000 });

        const result = await page.evaluate(() => {
            return document.querySelector('#inp').value;
        });

        await browser.close();

        res.setHeader('Content-Type', 'text/plain')
        res.send(result);
    });

    return app
}

module.exports = application;
