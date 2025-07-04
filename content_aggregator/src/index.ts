import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import puppeteer, { Browser } from 'puppeteer';

interface CountryData {
  country: string;
  code: string;
  foreign_affairs_ministry_url: string;
  http_response_code: string;
}

interface AggregationResult {
  country: string;
  code: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
  contentLength: number;
  htmlLength: number;
  processingTimeMs: number;
}

function parseArgs(): { maxConcurrency: number; timeout: number } {
  const args = process.argv.slice(2);
  let maxConcurrency = 5;
  let timeout = 15000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === 'concurrency') {
      maxConcurrency = parseInt(args[i + 1]) || 20;
      i++;
    } else if (args[i] === 'timeout') {
      timeout = parseInt(args[i + 1]) || 15000;
      i++;
    } else if (args[i] === 'help') {
      console.log('Usage: npm start [concurrency <number>] [timeout <number>] [help]');
      process.exit(0);
    }
  }

  return { maxConcurrency, timeout };
}

const CONFIG = parseArgs();

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function createResultsDir(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const resultsDir = path.join(__dirname, '..', 'results', dateStr);
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  return resultsDir;
}

async function aggregateUrl(country: CountryData, browser: Browser): Promise<{ result: AggregationResult; textContent: string; htmlContent: string }> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    await page.setViewport({ width: 1366, height: 768 });
    
    await page.goto(country.foreign_affairs_ministry_url, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout
    });
    
    // Wait a bit more for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const textContent = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      return document.body.innerText.replace(/\s+/g, ' ').trim();
    });
    
    // Get the full HTML content after rendering
    const htmlContent = await page.content();
    
    const processingTime = Date.now() - startTime;
    
    const result: AggregationResult = {
      country: country.country,
      code: country.code,
      url: country.foreign_affairs_ministry_url,
      timestamp,
      success: true,
      contentLength: textContent.length,
      htmlLength: htmlContent.length,
      processingTimeMs: processingTime
    };
    
    return { result, textContent, htmlContent };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    const result: AggregationResult = {
      country: country.country,
      code: country.code,
      url: country.foreign_affairs_ministry_url,
      timestamp,
      success: false,
      error: String(error),
      contentLength: 0,
      htmlLength: 0,
      processingTimeMs: processingTime
    };
    
    return { result, textContent: `Error: ${error}`, htmlContent: `Error: ${error}` };
  } finally {
    await page.close();
  }
}

async function saveResults(result: AggregationResult, textContent: string, htmlContent: string, resultsDir: string): Promise<void> {
  const textFilepath = path.join(resultsDir, `${result.code}.txt`);
  const htmlFilepath = path.join(resultsDir, `${result.code}.html`);
  const jsonFilepath = path.join(resultsDir, `${result.code}.json`);
  
  fs.writeFileSync(textFilepath, textContent, 'utf8');
  fs.writeFileSync(htmlFilepath, htmlContent, 'utf8');
  fs.writeFileSync(jsonFilepath, JSON.stringify(result, null, 2), 'utf8');
}

async function processCountriesInBatches(countries: CountryData[], browser: Browser, resultsDir: string): Promise<void> {
  log(`Starting batch processing with ${CONFIG.maxConcurrency} threads, ${CONFIG.timeout}ms timeout`);
  
  for (let i = 0; i < countries.length; i += CONFIG.maxConcurrency) {
    const batch = countries.slice(i, i + CONFIG.maxConcurrency);
    log(`Processing batch ${Math.floor(i / CONFIG.maxConcurrency) + 1}/${Math.ceil(countries.length / CONFIG.maxConcurrency)}`);
    
    const promises = batch.map(async (country) => {
      const jitter = Math.random() * 5000;
      await new Promise(resolve => setTimeout(resolve, jitter));
      
      log(`Processing ${country.country} (${country.code}) - ${country.foreign_affairs_ministry_url}`);
      const { result, textContent, htmlContent } = await aggregateUrl(country, browser);
      
      try {
        await saveResults(result, textContent, htmlContent, resultsDir);
        if (result.success) {
          log(`✓ Saved ${result.code}.txt, ${result.code}.html and ${result.code}.json (${result.htmlLength} chars HTML, ${result.contentLength} chars text)`);
        } else {
          log(`✗ Failed ${result.code}: ${result.error}`);
        }
      } catch (error) {
        log(`✗ Error saving ${result.code}: ${error}`);
      }
    });
    
    await Promise.all(promises);
  }
}

async function readCsvData(): Promise<CountryData[]> {
  const csvPath = path.join(__dirname, '..', '..', 'website', 'public', 'national_governments.csv');
  const results: CountryData[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data: any) => {
        if (data.foreign_affairs_ministry_url && 
            data.http_response_code === '200' && 
            data.foreign_affairs_ministry_url.startsWith('http')) {
          results.push({
            country: data.country,
            code: data.code,
            foreign_affairs_ministry_url: data.foreign_affairs_ministry_url,
            http_response_code: data.http_response_code
          });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function main() {
  log(`Starting MOFA URL aggregator with concurrency=${CONFIG.maxConcurrency}, timeout=${CONFIG.timeout}ms`);
  
  const countries = await readCsvData();
  log(`Found ${countries.length} working MOFA URLs`);
  
  const resultsDir = await createResultsDir();
  log(`Results will be saved to: ${resultsDir}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  await processCountriesInBatches(countries, browser, resultsDir);
  
  await browser.close();
  log('Aggregation completed');
}

main();