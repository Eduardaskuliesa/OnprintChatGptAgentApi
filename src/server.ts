import 'dotenv/config';
import express from 'express';
import logger from './utils/logger'
import routes from './routes';
import morgan from 'morgan';

const app = express();
const port = 4040;

app.use(express.json())
app.use(morgan('dev'));

routes(app);

app.listen(port, () => {
    logger.info(`🚀 Server is running on http://localhost:${port}`)
})