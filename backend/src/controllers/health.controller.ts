import type { Request, Response } from "express";
import { databasePool } from "../config/database";

export const getLiveness = (_request: Request, response: Response): void => {
  response.status(200).json({
    status: "UP",
    service: "sistema-reconstruccion-motores"
  });
};

export const getReadiness = async (_request: Request, response: Response): Promise<void> => {
  try {
    await databasePool.query("SELECT 1");
    response.status(200).json({
      status: "UP",
      service: "sistema-reconstruccion-motores",
      database: "connected"
    });
  } catch {
    response.status(503).json({
      status: "DEGRADED",
      service: "sistema-reconstruccion-motores",
      database: "disconnected"
    });
  }
};

export const getHealth = getReadiness;

