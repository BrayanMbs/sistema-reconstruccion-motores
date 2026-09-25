import cors, { type CorsOptions } from "cors";
import express from "express";
import { env } from "./config/env";
import { getLiveness } from "./controllers/health.controller";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { apiRouter } from "./routes";

export const app = express();

app.set("trust proxy", 1);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (env.allowVercelPreviews && /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
      callback(null, true);
      return;
    }

    if (!env.isProduction && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/health", getLiveness);
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

