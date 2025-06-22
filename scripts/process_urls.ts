import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

interface UrlTestResult {
    url: string;
    responseCode: string;
}

interface DuckDuckGoResult {
    Abstract: string;
    AbstractText: string;
    AbstractSource: string;
    AbstractURL: string;
    Image: string;
    ImageIsLogo: string;
    ImageHeight: string;
    ImageWidth: string;
    Heading: string;
    Results: Array<{
        Result: string;
        FirstURL: string;
        Icon: {
            URL: string;
            Height: string;
            Width: string;
        };
        Text: string;
    }>;
    Answer: string;
    AnswerType: string;
    Definition: string;
    DefinitionSource: string;
    DefinitionURL: string;
    RelatedTopics: Array<{
        Result: string;
        FirstURL: string;
        Icon: {
            URL: string;
            Height: string;
            Width: string;
        };
        Text: string;
    }>;
    Type: string;
    Redirect: string;
}

// Function to search DuckDuckGo for MOFA URLs
function searchDuckDuckGo(query: string): Promise<DuckDuckGoResult> {
    return new Promise((resolve, reject) => {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data) as DuckDuckGoResult;
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Function to extract potential MOFA URLs from search results
function extractMofaUrls(searchResult: DuckDuckGoResult): string[] {
    const urls: string[] = [];
    
    // Check abstract URL
    if (searchResult.AbstractURL) {
        urls.push(searchResult.AbstractURL);
    }
    
    // Check results
    searchResult.Results?.forEach(result => {
        if (result.FirstURL) {
            urls.push(result.FirstURL);
        }
    });
    
    // Check related topics
    searchResult.RelatedTopics?.forEach(topic => {
        if (topic.FirstURL) {
            urls.push(topic.FirstURL);
        }
    });
    
    // Filter for likely MOFA URLs
    return urls.filter(url => {
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes('foreign') ||
               lowerUrl.includes('mfa') ||
               lowerUrl.includes('mofa') ||
               lowerUrl.includes('exterior') ||
               lowerUrl.includes('diplomacy') ||
               lowerUrl.includes('diplomatic') ||
               lowerUrl.includes('international') ||
               lowerUrl.includes('affairs');
    });
}

// Function to test URL and follow redirects, returning final URL and response code
function testUrlWithRedirects(url: string, timeout: number = 10000, maxRedirects: number = 5): Promise<{finalUrl: string, responseCode: string}> {
    return new Promise((resolve) => {
        if (!url || url.trim() === '') {
            resolve({finalUrl: '', responseCode: ''});
            return;
        }

        let redirectCount = 0;
        
        function makeRequest(currentUrl: string): void {
            try {
                const urlObj = new URL(currentUrl);
                const protocol = urlObj.protocol === 'https:' ? https : http;
                
                const req = protocol.get(currentUrl, {
                    timeout,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }, (res) => {
                    const statusCode = res.statusCode || 0;
                    
                    // Handle redirects
                    if ((statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) && res.headers.location) {
                        if (redirectCount >= maxRedirects) {
                            resolve({finalUrl: currentUrl, responseCode: `${statusCode}_MAX_REDIRECTS`});
                            req.destroy();
                            return;
                        }
                        
                        redirectCount++;
                        let redirectUrl = res.headers.location;
                        
                        // Handle relative redirects
                        if (redirectUrl.startsWith('/')) {
                            redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
                        } else if (!redirectUrl.startsWith('http')) {
                            redirectUrl = `${urlObj.protocol}//${urlObj.host}/${redirectUrl}`;
                        }
                        
                        req.destroy();
                        makeRequest(redirectUrl);
                        return;
                    }
                    
                    // Final response
                    resolve({finalUrl: currentUrl, responseCode: statusCode.toString()});
                    req.destroy();
                });

                req.on('error', (err: NodeJS.ErrnoException) => {
                    if (err.code === 'ENOTFOUND') {
                        resolve({finalUrl: currentUrl, responseCode: 'DNS_ERROR'});
                    } else if (err.code === 'ECONNREFUSED') {
                        resolve({finalUrl: currentUrl, responseCode: 'CONNECTION_REFUSED'});
                    } else if (err.code === 'ETIMEDOUT') {
                        resolve({finalUrl: currentUrl, responseCode: 'TIMEOUT'});
                    } else {
                        resolve({finalUrl: currentUrl, responseCode: `ERROR_${err.code || 'UNKNOWN'}`});
                    }
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    resolve({finalUrl: currentUrl, responseCode: 'TIMEOUT'});
                });
                
            } catch (error) {
                resolve({finalUrl: currentUrl, responseCode: 'INVALID_URL'});
            }
        }
        
        makeRequest(url);
    });
}

// Backward compatibility function
function testUrl(url: string, timeout: number = 10000): Promise<string> {
    return testUrlWithRedirects(url, timeout).then(result => result.responseCode);
}

// Function to normalize URL
function normalizeUrl(domain: string): string {
    if (!domain || domain.trim() === '') {
        return '';
    }
    
    domain = domain.trim();
    
    // If it already has protocol, return as is
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
        return domain;
    }
    
    // Add https://www. prefix
    if (!domain.startsWith('www.')) {
        return `https://www.${domain}`;
    } else {
        return `https://${domain}`;
    }
}

async function processCSV(): Promise<void> {
    console.log('Reading CSV file...');
    const csvContent = fs.readFileSync('national_governments.csv', 'utf8');
    const lines = csvContent.split('\n');
    
    if (lines.length === 0) {
        console.error('CSV file is empty');
        return;
    }
    
    // Parse header
    const header = lines[0].split(',');
    let domainIndex = header.findIndex(col => col === 'foreign_affairs_ministry_domain');
    
    // If already renamed, look for the new name
    if (domainIndex === -1) {
        domainIndex = header.findIndex(col => col === 'foreign_affairs_ministry_url');
    }
    
    if (domainIndex === -1) {
        console.error('foreign_affairs_ministry_domain or foreign_affairs_ministry_url column not found');
        return;
    }
    
    // Update header if needed
    if (header[domainIndex] === 'foreign_affairs_ministry_domain') {
        header[domainIndex] = 'foreign_affairs_ministry_url';
    }
    
    // Remove old url_working column if it exists
    const urlWorkingIndex = header.findIndex(col => col === 'url_working');
    if (urlWorkingIndex !== -1) {
        header.splice(urlWorkingIndex, 1);
    }
    
    // Check if http_response_code column already exists
    if (!header.includes('http_response_code')) {
        header.push('http_response_code');
    }
    
    const responseCodeIndex = header.findIndex(col => col === 'http_response_code');
    
    console.log('Processing URLs...');
    const processedLines: string[] = [header.join(',')];
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const columns = lines[i].split(',');
        
        // Remove old url_working column data if it exists
        if (urlWorkingIndex !== -1 && columns.length > urlWorkingIndex) {
            columns.splice(urlWorkingIndex, 1);
        }
        
        const domain = columns[domainIndex] || '';
        const countryName = columns[0] || ''; // First column is country name
        
        let normalizedUrl = '';
        let responseCode = '';
        
        if (domain && domain.trim() !== '') {
            normalizedUrl = normalizeUrl(domain);
            console.log(`Testing: ${normalizedUrl}`);
            const result = await testUrlWithRedirects(normalizedUrl);
            responseCode = result.responseCode;
            
            // Update URL if it was redirected
            if (result.finalUrl !== normalizedUrl && result.responseCode === '200') {
                normalizedUrl = result.finalUrl;
                console.log(`${domain} -> ${normalizedUrl} - HTTP ${responseCode} (followed redirect)`);
            } else {
                console.log(`${normalizedUrl} - HTTP ${responseCode}`);
            }
        } else if (countryName && countryName.trim() !== '') {
            // Search for missing MOFA URL
            console.log(`Searching for MOFA URL for: ${countryName}`);
            try {
                const searchQuery = `ministry of foreign affairs ${countryName}`;
                const searchResult = await searchDuckDuckGo(searchQuery);
                
                // Take the first result from Results array
                if (searchResult.Results && searchResult.Results.length > 0) {
                    const candidateUrl = searchResult.Results[0].FirstURL;
                    console.log(`Found potential URL: ${candidateUrl}`);
                    const result = await testUrlWithRedirects(candidateUrl);
                    responseCode = result.responseCode;
                    
                    // Use final URL after following redirects
                    if (result.responseCode === '200' || result.responseCode === '301' || result.responseCode === '302') {
                        normalizedUrl = result.finalUrl;
                        console.log(`${candidateUrl} -> ${result.finalUrl} - HTTP ${responseCode} (FOUND via search)`);
                    } else {
                        normalizedUrl = candidateUrl;
                        console.log(`${candidateUrl} - HTTP ${responseCode} (FOUND via search)`);
                    }
                } else {
                    console.log(`No search results found for ${countryName}`);
                }
            } catch (error) {
                console.log(`Search failed for ${countryName}: ${error}`);
            }
        }
        
        // Update the URL column
        columns[domainIndex] = normalizedUrl;
        
        // Add or update response code
        if (responseCodeIndex < columns.length) {
            columns[responseCodeIndex] = responseCode;
        } else {
            columns.push(responseCode);
        }
        
        processedLines.push(columns.join(','));
    }
    
    // Write updated CSV
    console.log('Writing updated CSV...');
    fs.writeFileSync('national_governments.csv', processedLines.join('\n'));
    console.log('Processing complete!');
}

// Run the processing
processCSV().catch(console.error);