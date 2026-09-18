import { Router } from "express";
import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { operationalRouter } from "./operational.routes";
import { publicRouter } from "./public.routes";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/operativo", operationalRouter);
apiRouter.use("/public", publicRouter);
