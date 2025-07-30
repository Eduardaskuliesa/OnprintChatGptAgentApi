import 'dotenv/config';
import express from 'express';
import logger from './utils/logger'
import routes from './routes';
import morgan from 'morgan';
import helmet from 'helmet';

const app = express();
const port = 4080;

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.disable('x-powered-by');

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


routes(app);

app.use((req, res) => {
    res.setHeader('Connection', 'close');
    res.status(444).end();
});

app.listen(port, () => {
    logger.info(`🚀 Server is running on http://localhost:${port}`)
    logger.info(`🛡️ Helmet security headers enabled`);
})