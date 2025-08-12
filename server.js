const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const routes = require("./routes/scraper");

const app = express();
const PORT = process.env.PORT || 8081;
const BASE_URL = process.env.BASE_URL || "http://localhost";

const corsConfig = cors({
	origin: "*",
	methods: ["GET", "POST"],
	allowedHeaders: ["Content-Type"]
});

const rateLimiterConfig = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => ipKeyGenerator(req),
	message: { error: "Request limit has been reached, go touch grass..." },
}); 

app.use(
	corsConfig,
	rateLimiterConfig,
	routes
);

app.listen(PORT, () => {
	console.log(`API listening on ${BASE_URL}:${PORT}`);
});
