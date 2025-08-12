/**
*	Minimal Express API bootstrap:
*	- CORS (public)
*	- Rate limiting (per IP)
*	- Request logging (morgan)
*	- Versioned routing under /api/v{VERSION}
*	- Graceful shutdown on SIGINT/SIGTERM
*/

const express = require("express"); 
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 8081;
const BASE_URL = process.env.BASE_URL || "http://localhost";
const VERSION = process.env.VERSION || 1;
let shuttingDown = false;

// CORS: public API (any origin), limited to GET and JSON content
const corsConfig = cors({
	origin: "*",
	methods: ["GET"],
	allowedHeaders: ["Content-Type"]
});

// Rate limiter: 10 requests/min per IP; sends JSON error payload
const rateLimiterConfig = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => ipKeyGenerator(req),
	message: { error: "Request limit has been reached, go touch grass..." },
}); 

// Common middleware: CORS → rate limiter → request logger
app.use(
	corsConfig,
	rateLimiterConfig,
	morgan("dev")
);

// Mount versioned API routes (e.g., /api/v1/scrape)
app.use(`/api/v${VERSION}`, routes);

const server = app.listen(PORT, () => {
	console.log(`API listening on ${BASE_URL}:${PORT}/api/v${VERSION}`,);
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
