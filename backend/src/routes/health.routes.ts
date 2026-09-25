import { Router } from "express";
import { getReadiness } from "../controllers/health.controller";

export const healthRouter = Router();

healthRouter.get("/health", getReadiness);
