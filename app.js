const puppeteer = require('puppeteer');
const Busboy = require('busboy');
const forge = require('node-forge');

const login = 'c6b19a00-3764-4166-bf2b-e649083ef7a0';

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

    app.post('/decypher', (req, res) => {
        const busboy = new Busboy({ headers: req.headers });

        let privateKeyPem = '';
        let encryptedBuffer = Buffer.alloc(0);

        busboy.on('file', (fieldName, file, filename, encoding, mimetype) => {
            const chunks = [];

            file.on('data', (data) => {
                chunks.push(data);
            });

            file.on('end', () => {
                const fileData = Buffer.concat(chunks);

                if (fieldName === 'key') {
                    privateKeyPem = fileData.toString();
                } else if (fieldName === 'secret') {
                    encryptedBuffer = fileData;
                }
            });
        });

        busboy.on('finish', () => {
            try {
                const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
                const decrypted = privateKey.decrypt(encryptedBuffer.toString('binary'), 'RSA-OAEP');
                res.send(decrypted);
            } catch (err) {
                res.status(400).send('Ошибка расшифровки: ' + err.message);
            }
        });

        req.pipe(busboy);
    });

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
