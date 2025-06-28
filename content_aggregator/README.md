# MOFA URL Scraper

A TypeScript Node.js project that uses Puppeteer to scrape text content from Ministry of Foreign Affairs (MOFA) URLs with configurable parallel processing and metadata collection.

## Features

- Reads MOFA URLs from `../website/public/national_governments.csv`
- Only processes URLs with HTTP response code 200
- Configurable parallel processing with batching
- Scrapes text content using Puppeteer
- Saves both text content and metadata for each country
- Saves results in `results/<YYYY-MM-DD>/<country_ISO.txt>` and `<country_ISO.json>` format
- Comprehensive error handling and logging

## Installation

```bash
npm install
```

## Configuration

Configure the scraper using environment variables:

- `MAX_CONCURRENCY` - Maximum number of parallel requests (default: 7)
- `REQUEST_DELAY` - Delay between requests in milliseconds (default: 1000)
- `TIMEOUT` - Page load timeout in milliseconds (default: 30000)

## Usage

### Development (with ts-node)
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### With custom configuration
```bash
MAX_CONCURRENCY=5 REQUEST_DELAY=500 npm start
```

## Output

Results are saved in the `results/` directory with the following structure:
```
results/
└── 2025-06-28/
    ├── AF.txt          # Text content
    ├── AF.json         # Metadata
    ├── AL.txt
    ├── AL.json
    ├── DZ.txt
    ├── DZ.json
    └── ...
```

### Text Files (.txt)
Each `.txt` file contains the scraped text content from the corresponding country's MOFA website.

### Metadata Files (.json)
Each `.json` file contains metadata about the scraping process:
```json
{
  "country": "United States of America",
  "code": "US",
  "url": "https://www.state.gov",
  "timestamp": "2025-06-28T14:22:30.123Z",
  "success": true,
  "contentLength": 15420,
  "processingTimeMs": 2340
}
```

## Performance

- Processes requests in configurable batches to respect server limits
- Default configuration processes 7 URLs concurrently with 1-second delays
- Includes comprehensive error handling for failed requests
- Logs progress and completion status for each country