const puppeteer = require('puppeteer');
const multer = require('multer');
const forge = require('node-forge');
const sharp = require('sharp');

const login = 'artem_pityov';

const upload = multer();

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

    app.post("/size2json", upload.single("image"), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "Не передано поле image" });
            }

            const metadata = await sharp(req.file.buffer).metadata();

            res.json({
                width: metadata.width,
                height: metadata.height
            });
        } catch (err) {
            res.status(500).json({ error: "Ошибка обработки изображения" });
        }
    });

    app.get('/makeimage', (req, res) => {
        const width = parseInt(req.query.width, 10) || 100;
        const height = parseInt(req.query.height, 10) || 100;

        sharp({
            create: {
                width: width,
                height: height,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
        })
            .png()
            .toBuffer((err, data) => {
                if (err) {
                    return res.status(500).send('Error generating image');
                }
                res.set('Content-Type', 'image/png');
                res.send(data);
            });
    });

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

    app.get('/zombie', async (req, res) => {
        const number = Object.keys(req.query)[0] || req.query.n;

        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();

        await page.goto(`https://kodaktor.ru/g/d7290da?${number}`, {
            waitUntil: 'networkidle2'
        });

        await page.click('button');

        await page.waitForFunction(() => {
            return document.title && document.title.length > 0;
        }, { timeout: 1000 });

        const result = await page.evaluate(() => {
            return document.title;
        });

        await browser.close();

        res.setHeader('Content-Type', 'text/plain');
        res.send(result);
    });

    return app
}

module.exports = application;
