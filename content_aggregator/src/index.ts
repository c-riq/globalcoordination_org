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

async function createResultsDir(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  const resultsDir = path.join(__dirname, '..', 'results', dateStr);
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  return resultsDir;
}

async function scrapeUrl(url: string, browser: Browser): Promise<string> {
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
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
    
    return textContent;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return `Error: ${error}`;
  } finally {
    await page.close();
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
  
  try {
    // Read CSV data
    const countries = await readCsvData();
    console.log(`Found ${countries.length} working MOFA URLs`);
    
    // Create results directory
    const resultsDir = await createResultsDir();
    console.log(`Results will be saved to: ${resultsDir}`);
    
    // Launch browser
    const browser = await puppeteer.launch({ headless: true });
    
    // Process each country
    for (const country of countries) {
      console.log(`Processing ${country.country} (${country.code})...`);
      
      try {
        const content = await scrapeUrl(country.foreign_affairs_ministry_url, browser);
        const filename = `${country.code}.txt`;
        const filepath = path.join(resultsDir, filename);
        
        // Save content to file
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✓ Saved ${filename}`);
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`✗ Failed to process ${country.country}:`, error);
      }
    }
    
    await browser.close();
    console.log('Scraping completed!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();