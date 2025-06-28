# MOFA URL Scraper

A simple TypeScript Node.js project that uses Puppeteer to scrape text content from Ministry of Foreign Affairs (MOFA) URLs.

## Features

- Reads MOFA URLs from `../website/public/national_governments.csv`
- Only processes URLs with HTTP response code 200
- Scrapes text content using Puppeteer
- Saves results in `results/<YYYY-MM-DD>/<country_ISO.txt>` format

## Installation

```bash
npm install
```

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

## Output

Results are saved in the `results/` directory with the following structure:
```
results/
└── 2025-06-28/
    ├── AF.txt
    ├── AL.txt
    ├── DZ.txt
    └── ...
```

Each file contains the scraped text content from the corresponding country's MOFA website.