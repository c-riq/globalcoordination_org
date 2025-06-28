# MOFA URL Aggregator

Aggregates text content from MOFA URLs using Puppeteer with parallel processing.

## Installation

```bash
npm install
```

## Usage

```bash
npm start
npm start concurrency 10
npm start timeout 3000
npm start concurrency 5 timeout 8000
npm start help
```

## Output

Saves to `results/<YYYY-MM-DD>/`:
- `<ISO>.txt` - Text content
- `<ISO>.json` - Metadata (URL, timestamp, success, content length, processing time)

Console logs show aggregation progress, parameters, and status for each country.

## Configuration

- Default: 20 threads, 15000ms timeout
- Arguments: `concurrency <number>` `timeout <number>` `help`