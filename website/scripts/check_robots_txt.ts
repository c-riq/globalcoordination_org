import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// Function to test if robots.txt exists
function checkRobotsTxt(baseUrl: string, timeout: number = 10000): Promise<string> {
    return new Promise((resolve) => {
        if (!baseUrl || baseUrl.trim() === '') {
            resolve('');
            return;
        }

        try {
            const urlObj = new URL(baseUrl);
            const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
            const protocol = urlObj.protocol === 'https:' ? https : http;
            
            const req = protocol.get(robotsUrl, {
                timeout,
                headers: {
                    'User-Agent': 'globalcoordination.org-bot/1.0 (+https://globalcoordination.org) robots.txt checker'
                }
            }, (res) => {
                const statusCode = res.statusCode || 0;
                if (statusCode === 200) {
                    resolve('200');
                } else if (statusCode === 404) {
                    resolve('404');
                } else {
                    resolve(statusCode.toString());
                }
                req.destroy();
            });

            req.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'ENOTFOUND') {
                    resolve('DNS_ERROR');
                } else if (err.code === 'ECONNREFUSED') {
                    resolve('CONNECTION_REFUSED');
                } else if (err.code === 'ETIMEDOUT') {
                    resolve('TIMEOUT');
                } else {
                    resolve(`ERROR_${err.code || 'UNKNOWN'}`);
                }
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve('TIMEOUT');
            });
            
        } catch (error) {
            resolve('INVALID_URL');
        }
    });
}

async function addRobotsTxtColumn(): Promise<void> {
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
    
    if (urlIndex === -1) {
        console.error('foreign_affairs_ministry_url column not found');
        return;
    }
    
    // Add robots_txt column if it doesn't exist
    if (!header.includes('robots_txt')) {
        header.push('robots_txt');
    }
    
    const robotsIndex = header.findIndex(col => col === 'robots_txt');
    
    console.log('Checking robots.txt files...');
    const processedLines: string[] = [header.join(',')];
    let checkedCount = 0;
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const columns = lines[i].split(',');
        const url = columns[urlIndex] || '';
        const countryName = columns[0] || '';
        
        let robotsStatus = '';
        
        if (url && url.trim() !== '') {
            console.log(`Checking robots.txt for ${countryName}: ${url}`);
            robotsStatus = await checkRobotsTxt(url);
            console.log(`  → ${robotsStatus}`);
            checkedCount++;
        }
        
        // Add or update robots_txt column
        if (robotsIndex < columns.length) {
            columns[robotsIndex] = robotsStatus;
        } else {
            columns.push(robotsStatus);
        }
        
        processedLines.push(columns.join(','));
    }
    
    // Write updated CSV
    console.log(`Writing updated CSV with robots.txt status for ${checkedCount} URLs...`);
    fs.writeFileSync('national_governments.csv', processedLines.join('\n'));
    console.log('Robots.txt check complete!');
}

// Run the check
addRobotsTxtColumn().catch(console.error);