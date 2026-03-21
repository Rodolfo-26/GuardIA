import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.resolve(__dirname, "..", "logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_FILE_PATH = path.join(logsDir, "guardia-api.log");

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, category, action, message }) => {
    return `${timestamp} ${level} [${category || "SYSTEM"}] ${action ? `(${action}) ` : ""}${message}`;
  }),
);

const logger = winston.createLogger({
  level: "info",
  defaultMeta: {},
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: LOG_FILE_PATH,
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 3,
    }),
  ],
});

/**
 * Crea una entrada de log estructurada.
 */
export function logEvent(level, category, action, message, details = {}) {
  logger.log({ level, category, action, message, details });
}

export { LOG_FILE_PATH };
export default logger;
