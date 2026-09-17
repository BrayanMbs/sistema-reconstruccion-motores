import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { requireEmail, requireText } from "../validators/common.validators";
const service = new AuthService();
export const login = async (request: Request, response: Response): Promise<void> => { const result = await service.signIn(requireEmail(request.body.email), requireText(request.body.password, "Contraseña", 128)); response.json(result); };
export const currentUser = async (request: Request, response: Response): Promise<void> => { response.json({ user: request.appUser }); };
