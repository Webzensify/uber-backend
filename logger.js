const winston = require("winston");
const path = require("path");

// Ensure log directory exists
const logDirectory = "logs";
const errorLogFile = path.join(logDirectory, "error.log");
const combinedLogFile = path.join(logDirectory, "combined.log");

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: errorLogFile, level: "error" }), // Only errors
        new winston.transports.File({ filename: combinedLogFile }) // All logs
    ]
});

// If in development, also log to console
if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

module.exports = logger;  // Ensure you're exporting the logger correctly
