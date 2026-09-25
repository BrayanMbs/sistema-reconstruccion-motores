import type { Request, Response } from "express";
import { databasePool } from "../config/database";

export const getHealth = async (_request: Request, response: Response): Promise<void> => {
  let database = "connected";
  try {
    await databasePool.query("SELECT 1");
  } catch {
    database = "disconnected";
  }

  response.status(200).json({
    status: "UP",
    service: "sistema-reconstruccion-motores",
    database
  });
};

