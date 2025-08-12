const router = require("express").Router();
const scrapper = require("../services/scraper.js");

router.get("/scrape", scrapper);

module.exports = router;
