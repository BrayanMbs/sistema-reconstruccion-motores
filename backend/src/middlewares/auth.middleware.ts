import type { NextFunction, Request, Response } from "express";

/**
 * Placeholder for Supabase Auth token verification. Do not add custom JWT logic here;
 * this middleware will validate Supabase-issued access tokens when auth is implemented.
 */
export const requireAuthentication = (_request: Request, _response: Response, next: NextFunction): void => {
  next();
};
