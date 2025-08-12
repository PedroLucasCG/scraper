const express = require("express");
const router = express.Router();

const scraper = require("./scraper");

// Route for scraping Amazon search results
// Accessible at: GET /scrape?keyword=<term>&page=<n>&pages=<n>
router.use("/scrape", scraper);

// Catch-all for unmatched API routes (404)
router.use((req, res) => {
	res.status(404).json({
		error: "API route not found",
		method: req.method,
		path: req.originalUrl
	});
});

module.exports = router;
