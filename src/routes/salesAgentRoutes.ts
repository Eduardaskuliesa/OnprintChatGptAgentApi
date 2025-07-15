import { Router, Express } from 'express';
import { salesAgentController } from '../controllers/salesAgentCtontroller.ts';


const router = Router();

export const salesAgentRoutes = async (server: Express) => {
    server.get('/api/sales-agent/rules-and-folders', salesAgentController.getRulesAndFolder)
}

export default router;