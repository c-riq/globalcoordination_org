import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface CountryContent {
  code: string;
  content: string;
}

interface AnalysisResult {
  commonTopics: string[];
  countryAgreements: {
    topic: string;
    countries: string[];
    evidence: string;
  }[];
  dataContext: string;
}

async function loadTxtFiles(): Promise<CountryContent[]> {
  const resultsDir = path.join(__dirname, '..', 'results', '2025-06-28');
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.txt'));
  
  return files.map(file => ({
    code: file.replace('.txt', ''),
    content: fs.readFileSync(path.join(resultsDir, file), 'utf8')
  }));
}

async function analyzeWithGPT4o(countries: CountryContent[]): Promise<AnalysisResult> {
  const prompt = `Analyze the following foreign ministry website content from ${countries.length} countries to identify topics where multiple countries show agreement or similar positions.

Data Context: This content was scraped from official foreign affairs ministry websites on 2025-06-28 using automated web scraping. Each text represents the main content from a country's foreign ministry homepage or key policy pages.

Countries and their content:
${countries.map(c => `\n--- ${c.code} ---\n${c.content.slice(0, 2000)}...`).join('\n')}

Please identify:
1. Common topics/themes across multiple countries
2. Specific areas where 3+ countries show similar positions or language
3. Evidence of agreement or consensus

Return a structured analysis focusing on diplomatic consensus and shared priorities.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2000
  });

  const analysis = response.choices[0].message.content || '';
  
  // Parse the response into structured format
  return {
    commonTopics: extractTopics(analysis),
    countryAgreements: extractAgreements(analysis, countries.map(c => c.code)),
    dataContext: `Analysis based on ${countries.length} foreign ministry websites scraped on 2025-06-28. Content represents official diplomatic positions and priorities as published on government websites.`
  };
}

function extractTopics(analysis: string): string[] {
  const topics: string[] = [];
  const lines = analysis.split('\n');
  
  for (const line of lines) {
    if (line.includes('topic') || line.includes('theme') || line.includes('priority')) {
      const cleaned = line.replace(/^\d+\.?\s*/, '').replace(/[*-]\s*/, '').trim();
      if (cleaned.length > 10) topics.push(cleaned);
    }
  }
  
  return topics.slice(0, 10);
}

function extractAgreements(analysis: string, countryCodes: string[]): { topic: string; countries: string[]; evidence: string; }[] {
  const agreements: { topic: string; countries: string[]; evidence: string; }[] = [];
  const sections = analysis.split('\n\n');
  
  for (const section of sections) {
    const foundCountries = countryCodes.filter(code => section.includes(code));
    if (foundCountries.length >= 3) {
      const topic = section.split('\n')[0].replace(/^\d+\.?\s*/, '').trim();
      agreements.push({
        topic,
        countries: foundCountries,
        evidence: section.slice(0, 200) + '...'
      });
    }
  }
  
  return agreements.slice(0, 5);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable required');
    process.exit(1);
  }

  console.log('Loading .txt files...');
  const countries = await loadTxtFiles();
  console.log(`Loaded ${countries.length} country files`);

  console.log('Analyzing with GPT-4o...');
  const result = await analyzeWithGPT4o(countries);

  console.log('\n=== ANALYSIS RESULTS ===\n');
  console.log('DATA CONTEXT:');
  console.log(result.dataContext);
  
  console.log('\nCOMMON TOPICS:');
  result.commonTopics.forEach((topic, i) => console.log(`${i + 1}. ${topic}`));
  
  console.log('\nCOUNTRY AGREEMENTS:');
  result.countryAgreements.forEach((agreement, i) => {
    console.log(`\n${i + 1}. ${agreement.topic}`);
    console.log(`   Countries: ${agreement.countries.join(', ')}`);
    console.log(`   Evidence: ${agreement.evidence}`);
  });

  // Save results
  const outputPath = path.join(__dirname, '..', 'results', 'analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(console.error);