import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "err.body",
      "body",
      "password",
      "otp",
      "pan",
      "mobile",
      "token",
      "code",
    ],
    censor: "[REDACTED]",
  },
});

export default logger;
