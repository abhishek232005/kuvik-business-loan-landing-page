import config from "./config/env.js";
import pool from "./database/pool.js";
import logger from "./logger.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/index.js";
import { closeCrmPool, startCrmSyncWorker } from "./services/crm-sync.js";

const distDirectory = resolve(fileURLToPath(new URL("../../frontend/dist", import.meta.url)));

export function createApp({ serveFrontend = true } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxyHops);
  app.use(helmet());
  app.use(cors({
    origin: config.clientOrigin,
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  }));
  app.use(pinoHttp({
    logger,
    serializers: {
      req(request) {
        return { id: request.id, method: request.method, url: request.url.split("?")[0] };
      },
    },
  }));
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  }));
  app.use("/api", routes);
  app.use("/api", (_request, response) => response.status(404).json({ error: "Endpoint not found." }));
  if (serveFrontend) {
    app.use(express.static(distDirectory, {
      index: false,
      setHeaders(response, filePath) {
        if (filePath.includes("\\assets\\") || filePath.includes("/assets/")) {
          response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }));
    app.get("*", (_request, response, next) => {
      response.sendFile(resolve(distDirectory, "index.html"), (error) => {
        if (error) next(error);
      });
    });
  }
  app.use((_request, response) => response.status(404).json({ error: "Endpoint not found." }));
  app.use(errorHandler);
  return app;
}

async function start() {
  await pool.query("SELECT 1");
  const stopWorker = startCrmSyncWorker();
  const server = createApp().listen(config.port, () => {
    logger.info({ port: config.port, environment: config.nodeEnv }, "Kuvik Business Loan API listening");
  });

  async function shutdown(signal) {
    logger.info({ signal }, "Shutting down Business Loan API");
    await stopWorker();
    server.close(async (error) => {
      if (error) {
        logger.error({ code: error.code }, "Failed to close HTTP server");
        process.exitCode = 1;
      }
      try {
        await pool.end();
        await closeCrmPool();
      } catch (closeError) {
        logger.error({ code: closeError.code }, "Failed to close a database pool");
        process.exitCode = 1;
      }
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

function safeStartupError(error) {
  const secrets = [
    process.env.DB_PASSWORD,
    process.env.CRM_DB_PASSWORD,
    process.env.JWT_SECRET,
    process.env.DATA_ENCRYPTION_KEY,
    process.env.PHONE_HASH_SECRET,
    process.env.OTP_HASH_SECRET,
    process.env.SMS_API_TOKEN,
  ].filter(Boolean).sort((left, right) => right.length - left.length);

  const redactSecrets = (value) => secrets.reduce(
    (safeValue, secret) => safeValue.split(secret).join("[REDACTED]"),
    String(value),
  );

  return {
    name: error?.name || "Error",
    ...(error?.code ? { startupErrorCode: error.code } : {}),
    message: redactSecrets(error?.message || error),
    ...(error?.stack ? { stack: redactSecrets(error.stack) } : {}),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  start().catch((error) => {
    logger.fatal({ startupError: safeStartupError(error) }, "Kuvik Business Loan API failed to start");
    process.exitCode = 1;
  });
}
