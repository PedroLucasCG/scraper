const router = require("express").Router();
const scrapper = require("../services/scraper.js");

router.get("/", scrapper);

module.exports = router;
