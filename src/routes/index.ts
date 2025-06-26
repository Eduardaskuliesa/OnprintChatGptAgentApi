import { Express } from "express";
import { googleRoutes } from "./googleRoutes";
import { authenticate } from "../controllers/middleware/auth";

const routes = (server: Express) => {
    // server.use('/api', authenticate);
    googleRoutes(server)
}

export default routes;