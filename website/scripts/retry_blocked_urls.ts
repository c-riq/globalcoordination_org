import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// Function to test URL with enhanced browser headers
function testUrlWithBrowserHeaders(url: string, timeout: number = 30000): Promise<{finalUrl: string, responseCode: string}> {
    return new Promise((resolve) => {
        if (!url || url.trim() === '') {
            resolve({finalUrl: '', responseCode: ''});
            return;
        }

        let redirectCount = 0;
        const maxRedirects = 5;
        
        function makeRequest(currentUrl: string): void {
            try {
                const urlObj = new URL(currentUrl);
                const protocol = urlObj.protocol === 'https:' ? https : http;
                
                const req = protocol.get(currentUrl, { 
                    timeout,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Cache-Control': 'max-age=0'
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

async function retryBlockedUrls(): Promise<void> {
    console.log('Reading CSV file...');
    const csvContent = fs.readFileSync('national_governments.csv', 'utf8');
    const lines = csvContent.split('\n');
    
    if (lines.length === 0) {
        console.error('CSV file is empty');
        return;
    }
    
    // Parse header
    const header = lines[0].split(',');
    const urlIndex = header.findIndex(col => col === 'foreign_affairs_ministry_url');
    const responseCodeIndex = header.findIndex(col => col === 'http_response_code');
    
    if (urlIndex === -1 || responseCodeIndex === -1) {
        console.error('Required columns not found');
        return;
    }
    
    console.log('Looking for URLs with 403 or TIMEOUT responses...');
    const processedLines: string[] = [header.join(',')];
    let retryCount = 0;
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const columns = lines[i].split(',');
        const url = columns[urlIndex] || '';
        const responseCode = columns[responseCodeIndex] || '';
        const countryName = columns[0] || '';
        
        // Only retry URLs with 403 or TIMEOUT
        if (url && (responseCode === '403' || responseCode === 'TIMEOUT')) {
            console.log(`Retrying ${countryName}: ${url} (was ${responseCode})`);
            const result = await testUrlWithBrowserHeaders(url);
            
            // Update URL and response code
            if (result.finalUrl !== url && result.responseCode === '200') {
                columns[urlIndex] = result.finalUrl;
                console.log(`  → ${result.finalUrl} - HTTP ${result.responseCode} (followed redirect)`);
            } else {
                console.log(`  → HTTP ${result.responseCode}`);
            }
            columns[responseCodeIndex] = result.responseCode;
            retryCount++;
        }
        
        processedLines.push(columns.join(','));
    }
    
    if (retryCount === 0) {
        console.log('No URLs with 403 or TIMEOUT found to retry.');
        return;
    }
    
    // Write updated CSV
    console.log(`Writing updated CSV with ${retryCount} retried URLs...`);
    fs.writeFileSync('national_governments.csv', processedLines.join('\n'));
    console.log('Retry complete!');
}

// Run the retry process
retryBlockedUrls().catch(console.error);