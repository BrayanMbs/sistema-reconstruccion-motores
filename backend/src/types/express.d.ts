import type { AppUser } from "../models/domain";

declare global {
  namespace Express {
    interface Request {
      appUser?: AppUser;
    }
  }
}

export {};
