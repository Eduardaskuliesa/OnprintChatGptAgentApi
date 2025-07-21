import { Router, Express } from 'express';
import { salesAgentController } from '../controllers/salesAgentCtontroller.ts';


const router = Router();

export const salesAgentRoutes = async (server: Express) => {
    server.get('/api/sales-agent/rules-and-folders', salesAgentController.getRulesAndFolder)
    server.get('/api/sales-agent/design-recommendations', salesAgentController.getDesignRecommendations);
}

export default router;