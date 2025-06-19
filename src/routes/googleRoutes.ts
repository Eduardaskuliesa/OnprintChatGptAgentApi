import { Router, Express } from 'express';
import { googleController } from '../controllers/googleController.t';

const router = Router();

export const googleRoutes = async (server: Express) => {
    server.get('/api/folders', googleController.getFoldersWithFiles)
    server.post('/api/content', googleController.getFolderFilesContent)
}

export default router;