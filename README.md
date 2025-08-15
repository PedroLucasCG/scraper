# Amazon Product Scraper — Backend (Express API)

Scrapes Amazon search results and returns structured JSON (title, rating, review count, image, URL) with pagination metadata.

---

## Features

* **Endpoint:** `GET /api/scrape?keyword=...&page=1&pages=1`
* **Parsing:** JSDOM; filters sponsored listings
* **Pagination:** `page`, `totalPages`, `hasNext`, `nextPage`
* **Hardening:** realistic headers, CORS, IPv6‑safe rate limit
* **Logging:** morgan + optional debug logs
* **Graceful shutdown:** handles `SIGINT`/`SIGTERM`

---

## Requirements

* **Bun** (recommended) or **Node.js 18+**
* Works on Windows, macOS, Linux

---

## Setup (Windows + Bun)

1. **Install Bun**

```powershell
irm bun.sh/install.ps1 | iex
# restart terminal
bun --version
```

2. **Install dependencies**

```powershell
bun install
```

3. **Environment**

Copy the example and adjust values:

```powershell
Copy-Item .env.example .env
```

Key variables (see `.env.example` for all):

```env
PORT=8082
SCRAPING_URI=https://www.amazon.com
MAX_PAGES=3
CORS_ORIGINS=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
MORGAN_FORMAT=dev
DEBUG=0
```

---

## Run

### Dev (Bun)

```powershell
bun run server.js
# or, if you added scripts:
# bun run dev:server
```

### Dev (Node)

```powershell
node server.js
```

> There is dotenv in the project in case you are not running with bun

---

## API

### `GET /api/scrape`

**Query params**

* `keyword` **(required)**: search term
* `page` *(default: 1)*: 1‑based page to fetch
* `pages` *(default: 1, max = `MAX_PAGES`)*: consecutive pages to fetch (1..MAX\_PAGES)

**Example**

```bash
curl "http://localhost:8082/api/scrape?keyword=notebook&page=1"
```

**Response**

```json
{
  "keyword": "notebook",
  "page": 1,
  "currentPage": 1,
  "totalPages": 7,
  "pagesFetched": 1,
  "hasNext": true,
  "nextPage": 2,
  "count": 24,
  "products": [
    {
      "asin": "B0XXXXXXX",
      "title": "Great Notebook 13”",
      "rating": 4.6,
      "reviews": 2897,
      "image": "https://.../image.jpg",
      "url": "https://www.amazon.com/dp/B0XXXXXXX"
    }
  ]
}
```

**Error shape**

```json
{ "error": "Missing ?keyword=" }
```

```json
{ "error": "Scraping of https://www.amazon.com failed.", "details": "HTTP 503" }
```

---

## Project Structure (backend)

```
server.js
routes/
  index.js
  scraper.js
services/
  scraper.js          # buildUrl, fetchHtml (axios), parseProducts (JSDOM), findTotalPages
```

---

## Notable Implementation Details

* **Headers for scraping**

  * Uses a modern desktop **User‑Agent** and standard accept headers to reduce bot pages.
* **Pagination detection**

  * Reads Amazon’s `.s-pagination-strip`; computes `totalPages` by scanning numeric items, and `hasNext` by checking the “next” link state.
* **Sponsored filtering**

  * Skips cards with `.AdHolder` or “Sponsored” labels.
* **Rate limiting**

  * `express-rate-limit` with `keyGenerator: ipKeyGenerator(req)` to avoid IPv6 bypasses.
* **CORS**

  * Allowlist via `CORS_ORIGINS` (comma‑separated). Use `http://localhost:5173` for Vite in dev.

---

## Scripts (suggested `package.json`)

```json
{
  "scripts": {
    "dev:server": "bun run server.js",
    "lint": "bunx eslint .",
    "format": "bunx prettier -w ."
  }
}
```

---

## Graceful Shutdown

On `SIGINT`/`SIGTERM`:

* Stop accepting new connections
* Let in‑flight requests finish

This prevents half‑processed responses during restarts and plays nicely with Docker/K8s.


## License

MIT (or your preference).
