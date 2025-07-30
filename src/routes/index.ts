import { Express } from "express";
import { googleRoutes } from "./googleRoutes";
import { authenticate } from "../middleware/auth";
import { salesAgentRoutes } from "./salesAgentRoutes";
import { googleController } from "../controllers/googleController";


const routes = (server: Express) => {
    server.get('/oauth2callback', googleController.handleOAuthCallback);
    server.use(authenticate);
    googleRoutes(server)
    salesAgentRoutes(server)
}

export default routes;