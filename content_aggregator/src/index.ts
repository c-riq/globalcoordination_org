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

interface ScrapingResult {
  country: string;
  code: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
  contentLength: number;
  processingTimeMs: number;
}

// Configuration
const CONFIG = {
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '20'),
  requestDelay: parseInt(process.env.REQUEST_DELAY || '1000'),
  timeout: parseInt(process.env.TIMEOUT || '30000')
};

async function createResultsDir(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  const resultsDir = path.join(__dirname, '..', 'results', dateStr);
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  return resultsDir;
}

async function scrapeUrl(country: CountryData, browser: Browser): Promise<ScrapingResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const page = await browser.newPage();
  
  try {
    await page.goto(country.foreign_affairs_ministry_url, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout
    });
    
    // Extract text content from the page
    const textContent = await page.evaluate(() => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      // Get text content and clean it up
      return document.body.innerText
        .replace(/\s+/g, ' ')
        .trim();
    });
    
    const processingTime = Date.now() - startTime;
    
    return {
      country: country.country,
      code: country.code,
      url: country.foreign_affairs_ministry_url,
      timestamp,
      success: true,
      contentLength: textContent.length,
      processingTimeMs: processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Error scraping ${country.foreign_affairs_ministry_url}:`, error);
    
    return {
      country: country.country,
      code: country.code,
      url: country.foreign_affairs_ministry_url,
      timestamp,
      success: false,
      error: String(error),
      contentLength: 0,
      processingTimeMs: processingTime
    };
  } finally {
    await page.close();
  }
}

async function saveResults(result: ScrapingResult, content: string, resultsDir: string): Promise<void> {
  const textFilename = `${result.code}.txt`;
  const jsonFilename = `${result.code}.json`;
  const textFilepath = path.join(resultsDir, textFilename);
  const jsonFilepath = path.join(resultsDir, jsonFilename);
  
  // Save text content
  fs.writeFileSync(textFilepath, content, 'utf8');
  
  // Save metadata
  fs.writeFileSync(jsonFilepath, JSON.stringify(result, null, 2), 'utf8');
}

async function processCountriesInBatches(countries: CountryData[], browser: Browser, resultsDir: string): Promise<void> {
  console.log(`Processing ${countries.length} countries with max concurrency: ${CONFIG.maxConcurrency}`);
  
  for (let i = 0; i < countries.length; i += CONFIG.maxConcurrency) {
    const batch = countries.slice(i, i + CONFIG.maxConcurrency);
    
    const promises = batch.map(async (country) => {
      console.log(`Processing ${country.country} (${country.code})...`);
      
      const result = await scrapeUrl(country, browser);
      
      if (result.success) {
        // Get the content from the page again for saving
        const page = await browser.newPage();
        try {
          await page.goto(country.foreign_affairs_ministry_url, {
            waitUntil: 'networkidle2',
            timeout: CONFIG.timeout
          });
          
          const textContent = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script, style');
            scripts.forEach(el => el.remove());
            return document.body.innerText.replace(/\s+/g, ' ').trim();
          });
          
          await saveResults(result, textContent, resultsDir);
          console.log(`✓ Saved ${result.code}.txt and ${result.code}.json`);
        } catch (error) {
          await saveResults(result, `Error: ${error}`, resultsDir);
          console.log(`✗ Saved error for ${result.code}`);
        } finally {
          await page.close();
        }
      } else {
        await saveResults(result, `Error: ${result.error}`, resultsDir);
        console.log(`✗ Saved error for ${result.code}`);
      }
      
      // Delay between requests
      if (CONFIG.requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
      }
    });
    
    await Promise.all(promises);
    
    console.log(`Completed batch ${Math.floor(i / CONFIG.maxConcurrency) + 1}/${Math.ceil(countries.length / CONFIG.maxConcurrency)}`);
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
  console.log('Starting MOFA URL scraper...');
  console.log(`Configuration: Max Concurrency=${CONFIG.maxConcurrency}, Request Delay=${CONFIG.requestDelay}ms, Timeout=${CONFIG.timeout}ms`);
  
  try {
    // Read CSV data
    const countries = await readCsvData();
    console.log(`Found ${countries.length} working MOFA URLs`);
    
    // Create results directory
    const resultsDir = await createResultsDir();
    console.log(`Results will be saved to: ${resultsDir}`);
    
    // Launch browser
    const browser = await puppeteer.launch({ headless: true });
    
    // Process countries in batches
    await processCountriesInBatches(countries, browser, resultsDir);
    
    await browser.close();
    console.log('Scraping completed!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();