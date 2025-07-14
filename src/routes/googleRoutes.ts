import { Router, Express } from 'express';
import { googleController } from '../controllers/googleController';
import { geminiController } from '../controllers/geminiController';

const router = Router();

export const googleRoutes = async (server: Express) => {
    server.get('/api/google-consent', googleController.getGoogleConsentUrl)   
    server.get('/oauth2callback', googleController.handleOAuthCallback);


    server.post('/api/create-in-folder', googleController.createInExistingFolder);
    server.post('/api/update-file', googleController.updateFileContent)
    server.post('/api/create-new', googleController.createNewFoldersAndFiles)
    server.get('/api/folders', googleController.getFoldersWithFiles)
    server.post('/api/content', googleController.getFolderFilesContent)
    server.post('/api/archive-file', googleController.deleteFolderFiles);
  
    server.post('/api/gemini/chat', geminiController.chat);
    server.get('/api/check-storage', googleController.checkStorageUsage);
}

export default router;