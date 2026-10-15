import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import config from "../config/env.js";
import logger from "../logger.js";

export function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function requireLeadToken(request, response, next) {
  const token = request.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return response.status(401).json({ error: "Verification is required." });
  try {
    const claims = jwt.verify(token, config.jwtSecret, {
      issuer: "kuvik-loans",
      audience: "business-loan-lead",
    });
    if (!["lead", "verified-mobile"].includes(claims.scope)) {
      return response.status(401).json({ error: "Verification is required." });
    }
    request.auth = claims;
    return next();
  } catch {
    return response.status(401).json({ error: "Verification expired. Please verify your mobile again." });
  }
}

export function errorHandler(error, request, response, _next) {
  if (error instanceof ZodError) {
    return response.status(400).json({ error: error.issues[0]?.message || "Invalid request." });
  }
  if (error.type === "entity.too.large") return response.status(413).json({ error: "Request is too large." });
  if (error.type === "entity.parse.failed") return response.status(400).json({ error: "Request body must be valid JSON." });
  logger.error(
    { errorName: error.name, errorCode: error.code, path: request.path },
    "Request failed",
  );
  if (["ER_NO_SUCH_TABLE", "ER_BAD_DB_ERROR", "ER_BAD_FIELD_ERROR"].includes(error.code)) {
    return response.status(503).json({
      error: `Required Business Loan tables are missing from database "${config.database.name}". Apply database\\schema.sql, then retry.`,
    });
  }
  if ([
    "ECONNREFUSED",
    "ETIMEDOUT",
    "PROTOCOL_CONNECTION_LOST",
    "ER_ACCESS_DENIED_ERROR",
    "ER_DBACCESS_DENIED_ERROR",
    "ER_TABLEACCESS_DENIED_ERROR",
  ].includes(error.code)) {
    return response.status(503).json({
      error: "The database is unavailable or the runtime account lacks required table permissions. Check backend/.env and database grants.",
    });
  }
  return response.status(500).json({ error: "Something went wrong. Please try again." });
}
