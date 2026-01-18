import { MongoClient } from 'mongodb';

export default (express, bodyParser, createReadStream, crypto, http) => {
    const app = express()
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json())
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/')
        next()
    })

    app.get('/login/', (req, res) => {
        res.end('c6b19a00-3764-4166-bf2b-e649083ef7a0')
    })

    app.get('/code/', (req, res) => {
        createReadStream(import.meta.url.substring(7)).pipe(res)
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
        res.end('c6b19a00-3764-4166-bf2b-e649083ef7a0')
    })

    return app
}