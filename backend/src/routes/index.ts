import { Router } from "express";
import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { operationalRouter } from "./operational.routes";
import { administrativeRouter } from "./administrative.routes";
import { publicRouter } from "./public.routes";
import { inventoryRouter } from "./inventory.routes";
import { cashierRouter } from "./cashier.routes";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/administrativo", administrativeRouter);
apiRouter.use("/operativo", operationalRouter);
apiRouter.use("/public", publicRouter);
apiRouter.use("/inventory", inventoryRouter);
apiRouter.use("/cashier", cashierRouter);
