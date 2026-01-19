const { MongoClient } = require('mongodb');
const axios = require('axios');
const pug = require('pug');

const login = 'c6b19a00-3764-4166-bf2b-e649083ef7a0';

const application = (express, bodyParser, createReadStream, crypto, http) => {
    const app = express()
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json())
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        next()
    })

    app.get('/login/', (req, res) => {
        res.end(login)
    })

    app.get('/sha1/:input/', (req, res) => {
        res.end(crypto.createHash('sha1').update(req.params.input).digest('hex'))
    })

    const handler = (req, res) => {
        const addr = req.query.addr || req.body && req.body.addr
        if (!addr) return res.end('')
        http.get(addr, r => {
            let data = ''
            r.on('data', c => { data += c })
            r.on('end', () => res.end(data))
        }).on('error', () => res.end(''))
    }

    app.get('/wordpress/wp-json/wp/v2/posts/1', (_, res) => {
        res.json({
            id: 1,
            slug: login,
            title: {
                rendered: login
            },
            content: {
                rendered: "",
                protected: false
            }
        });
    });

    app.post('/render/', async (req, res) => {
        const { random2, random3 } = req.body;
        const { addr } = req.query;

        const templateResponse = await axios.get(addr);
        const pugTemplate = templateResponse.data;

        const compiled = pug.compile(pugTemplate);
        const html = compiled({ random2, random3 });

        res.set('Content-Type', 'text/html');
        res.send(html);
    });

    app.post('/insert/', async (req, res) => {
        let client;

        try {
            const { login, password, URL } = req.body;

            client = new MongoClient(URL, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });

            await client.connect();

            const dbName = URL.split('/').pop().split('?')[0];
            const db = client.db(dbName);

            const usersCollection = db.collection('users');

            const userDocument = {
                login: login,
                password: password,
                createdAt: new Date()
            };

            await usersCollection.insertOne(userDocument);

            res.sendStatus(200);
        } catch (err) {
            res.sendStatus(500);
        } finally {
            if (client) {
                await client.close();
            }
        }
    })

    app.get('/req/', handler)
    app.post('/req/', handler)

    app.all(/.*/, (req, res) => {
        res.end(login)
    })

    return app
}

module.exports = application;
