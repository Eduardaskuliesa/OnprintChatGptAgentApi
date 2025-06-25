import { Router, Express } from 'express';
import { googleController } from '../controllers/googleController.t';

const router = Router();

export const googleRoutes = async (server: Express) => {
    server.post('/api/create-in-folder', googleController.createInExistingFolder);
    server.post('/api/update-file', googleController.updateFileContent)
    server.post('/api/create-new', googleController.createNewFoldersAndFiles)
    server.get('/api/folders', googleController.getFoldersWithFiles)
    server.post('/api/content', googleController.getFolderFilesContent)
}

export default router;