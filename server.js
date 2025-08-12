/**
*	Minimal Express API bootstrap:
*	- CORS (public)
*	- Rate limiting (per IP)
*	- Request logging (morgan)
*	- Versioned routing under /api/v{VERSION}
*	- Graceful shutdown on SIGINT/SIGTERM
*/

require("dotenv").config();
const express = require("express"); 
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const routes = require("./routes");

const app = express();

const {
  PORT = 8081,
  BASE_URL = "http://localhost",
  RATE_LIMIT_WINDOW_MS = 60000,
  RATE_LIMIT_MAX = 10,
  MORGAN_FORMAT = "dev",
} = process.env;

const port = Number(PORT);
const rateLimitWindowMs = Number(RATE_LIMIT_WINDOW_MS);
const rateLimitMax = Number(RATE_LIMIT_MAX);

let shuttingDown = false;

// CORS: public API (any origin), limited to GET and JSON content
const corsConfig = cors({
	origin: "*",
	methods: ["GET"],
	allowedHeaders: ["Content-Type"]
});

// Rate limiter: 10 requests/min per IP; sends JSON error payload
const rateLimiterConfig = rateLimit({
	windowMs: rateLimitWindowMs,
	max: rateLimitMax,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => ipKeyGenerator(req),
	message: { error: "Request limit has been reached, go touch grass..." },
}); 

// Common middleware: CORS → rate limiter → request logger
app.use(
	corsConfig,
	rateLimiterConfig,
	morgan(MORGAN_FORMAT)
);

// Mount versioned API routes (e.g., /api/scrape)
app.use(`/api`, routes);

const server = app.listen(port, () => {
	console.log(`API listening on ${BASE_URL}:${port}/api`,);
});


// Graceful shutdown: stop accepting new connections, then exit
function gracefulShutdown(signal) {
	if (shuttingDown) return;
	shuttingDown = true;
	console.log(`[${signal}] Graceful shutdown started…`);
	server.close((err) => {
		if (err) {
			console.error("Error closing server:", err);
			process.exit(1);
		}
		console.log("HTTP server closed cleanly.");
		process.exit(0);
	});
}

["SIGINT", "SIGTERM"].forEach((sig) => {
	process.on(sig, () => gracefulShutdown(sig));
});
