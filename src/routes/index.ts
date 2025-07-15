import { Express } from "express";
import { googleRoutes } from "./googleRoutes";
import { authenticate } from "../middleware/auth";
import { salesAgentRoutes } from "./salesAgentRoutes";


const routes = (server: Express) => {
    server.use(authenticate);
    googleRoutes(server)
    salesAgentRoutes(server)
}

export default routes;