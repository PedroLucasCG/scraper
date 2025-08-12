const axios = require("axios");
const { JSDOM } = require("jsdom");
const SCRAPING_URI = process.env.SCRAPPING_URI || "https://www.amazon.com/";
const MAX_PAGES = process.env.MAX_PAGES || 3;

function buildUrl(keyword, page = 1) {
	const params = new URLSearchParams({
		k: keyword,
		s: "review-rank",
		page: String(page)
	});
	return `${SCRAPING_URI}/s?${params.toString()}`;
}

async function fetchHtml(url) {
	const { data } = await axios.get(url, {
		headers: {
			"User-Agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
			"(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.9",
			"Cache-Control": "no-cache",
			"Pragma": "no-cache",
			"Upgrade-Insecure-Requests": "1"
		},
		timeout: 25000,
		maxRedirects: 5
	});
	return data;
}

function parseProducts(html) {
	const doc = new JSDOM(html).window.document;

	const cards = Array.from(
		doc.querySelectorAll(
			"div.s-main-slot div.s-result-item.s-asin[data-asin]:not([data-asin='']):not(.AdHolder)"
		)
	);

	const products = cards.map((card) => {
	const isSponsored =
	card.classList.contains("AdHolder") ||
	!!card.querySelector("[aria-label='Sponsored'], .s-sponsored-label-text, [data-component-type='sp-sponsored-result']");
	if (isSponsored) return null;

	const asin = card.getAttribute("data-asin") || null;

	const title =
		card.querySelector("h2 a span")?.textContent?.trim() ||
		card.querySelector("h2 span")?.textContent?.trim() ||
		null;

	const ratingText =
		card.querySelector("i.a-icon-star-small span.a-icon-alt")?.textContent?.trim() ||
		card.querySelector("i.a-icon-star span.a-icon-alt")?.textContent?.trim() ||
		card.querySelector("[aria-label$='out of 5 stars']")?.getAttribute("aria-label") ||
		null;

	let rating = null;
	if (ratingText) {
		const m = ratingText.match(/([\d.]+)\s+out of\s+5/i);
		if (m) rating = parseFloat(m[1]);
	}

	const reviewsCandidate =
		card.querySelector("span[aria-label$='ratings']")?.getAttribute("aria-label") ||
		card.querySelector("span[aria-label$='rating']")?.getAttribute("aria-label") ||
		card.querySelector("span.a-size-base.s-underline-text")?.textContent?.trim() ||
		null;

	let reviews = null;
	if (reviewsCandidate) {
		const digits = reviewsCandidate.replace(/[^\d]/g, "");
		if (digits) reviews = parseInt(digits, 10);
	}

	const image =
		card.querySelector("img.s-image")?.getAttribute("src") ||
		card.querySelector("img.s-image")?.getAttribute("data-src") ||
		null;

	const href = card.querySelector("h2 a")?.getAttribute("href");
	const url = asin
		? `${SCRAPING_URI}/dp/${asin}`
		: href
		? new URL(href, SCRAPING_URI).href
		: null;

	if (!title) return null;
		return { asin, title, rating, reviews, image, url };
	}).filter(Boolean);

	const nextLink =
		doc.querySelector("a.s-pagination-next:not(.s-pagination-disabled)") ||
		doc.querySelector("a[aria-label='Go to next page']");

	return { products, hasNext: !!nextLink };
}

module.exports = async function scraper(req, res, next) {
	try {
		const keyword = (req.query.keyword || "").toString().trim();
		if (!keyword) return res.status(400).json({ error: "Missing ?keyword=" });

		const page = Math.max(1, parseInt(req.query.page || "1", 10));
		const pages = Math.max(1, Math.min(MAX_PAGES, parseInt(req.query.pages || "1", 10)));

		let all = [];
		let hasNext = false;
		for (let i = 0; i < pages; i++) {
			const currentPage = page + i;
			const url = buildUrl(keyword, currentPage);
			const html = await fetchHtml(url);
			const { products, hasNext: nextExists } = parseProducts(html);
			all = all.concat(products);
			hasNext = nextExists;
			if (!nextExists) break;
		}

		res.json({
			keyword,
			page,
			pagesFetched: Math.min(pages, all.length ? pages : 0),
			hasNext,
			nextPage: hasNext ? page + pages : null,
			count: all.length,
			products: all
		});
	} catch (err) {
		res.status(500).json({
			error: `Scraping of ${SCRAPING_URI} failed.`,
			details: err?.message || String(err)
		});
	}
};
