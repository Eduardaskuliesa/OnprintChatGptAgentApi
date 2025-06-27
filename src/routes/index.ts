import { Express } from "express";
import { googleRoutes } from "./googleRoutes";
import { authenticate } from "../middleware/auth";

const routes = (server: Express) => {
    server.use(authenticate);
    googleRoutes(server)
}

export default routes;