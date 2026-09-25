import { Router } from "express";
import { changeTemporaryPassword, currentUser, login } from "../controllers/auth.controller";
import { requireAuthentication } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
export const authRouter = Router();
authRouter.post("/login", asyncHandler(login));
authRouter.get("/me", requireAuthentication, asyncHandler(currentUser));
authRouter.post("/change-temporary-password", requireAuthentication, asyncHandler(changeTemporaryPassword));
