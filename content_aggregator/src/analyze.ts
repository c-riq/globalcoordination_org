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
    countries: [{ [countryCode: string]: string }];
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
  const systemPrompt = `You are a diplomatic analyst specializing in identifying shared positions among countries on major global issues. Your task is to analyze foreign ministry website content and identify SPECIFIC STANCES where multiple countries show agreement.

Focus on finding specific stances such as:
- UKRAINE CONFLICT: Support for Ukraine, condemnation of Russia, sanctions, military aid
- ISRAEL/GAZA CONFLICT: Support for Israel, support for Palestinians, ceasefire calls, humanitarian aid
- IRAN: Nuclear program concerns, sanctions, diplomatic relations, regional tensions
- CLIMATE CHANGE: Paris Agreement, net zero commitments, climate finance, green transition
- HUMAN RIGHTS: Democracy promotion, authoritarian criticism, minority rights, women's rights

CRITICAL: Use EXACT quotes from the input text. Do NOT add trailing periods, punctuation, or modify the text in any way. Copy the text exactly as it appears in the source material.

Return ONLY valid JSON in this exact structure:
{
  "commonTopics": ["Brief topic descriptions"],
  "countryAgreements": [
    {
      "topic": "Specific stance description",
      "countries": [{ "US": "exact quote from input conveying the stance", "DE": "exact quote from input conveying the stance", "FR": "exact quote from input conveying the stance" }],
    }
  ]
}

Only include positions where at least 2 countries clearly agree. Be specific and factual.`;

  const userPrompt = `Analyze the following foreign ministry website content from ${countries.length} countries:

${countries.map(c => `--- ${c.code} ---\n${c.content.slice(0, 25_000)}`).join('\n\n')}`;

  console.log(`Sending ${countries.length} countries to GPT-4o...`);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,
    max_tokens: 6_000,
    response_format: { type: "json_object" }
  });

  if (response.usage) {
    console.log('Input tokens:', response.usage.prompt_tokens);
    console.log('Output tokens:', response.usage.completion_tokens);
    console.log('Total tokens:', response.usage.total_tokens);
  }

  const jsonResponse = response.choices[0].message.content || '{}';
  console.log('GPT-4o response length:', jsonResponse.length);
  
  try {
    const parsed = JSON.parse(jsonResponse);
    console.log('Parsed successfully. Topics:', parsed.commonTopics?.length || 0, 'Agreements:', parsed.countryAgreements?.length || 0);
    
    return {
      commonTopics: parsed.commonTopics || [],
      countryAgreements: parsed.countryAgreements || [],
      dataContext: parsed.dataContext || `Analysis based on ${countries.length} foreign ministry websites scraped on 2025-06-28. Content represents official diplomatic positions and priorities as published on government websites.`
    };
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    console.error('Raw response:', jsonResponse.slice(0, 500));
    return {
      commonTopics: ['Error: Could not parse GPT-4o response as JSON'],
      countryAgreements: [],
      dataContext: `Analysis failed - JSON parsing error. Raw response: ${jsonResponse.slice(0, 200)}...`
    };
  }
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
    console.log(`   Countries:`);
    agreement.countries.forEach(countryObj => {
      Object.entries(countryObj).forEach(([code, quote]) => {
        // Verify if the quote actually exists in the country's content
        const countryData = countries.find(c => c.code === code);
        const verified = countryData ? countryData.content.includes(quote) : false;
        const status = verified ? '✓' : '✗';
        console.log(`     ${code}: "${quote}" ${status}`);
      });
    });
  });

  // Save results with verification status
  const verifiedResult = {
    ...result,
    countryAgreements: result.countryAgreements.map(agreement => ({
      ...agreement,
      countries: agreement.countries.map(countryObj => {
        const verifiedCountryObj: { [key: string]: { quote: string; verified: boolean } } = {};
        Object.entries(countryObj).forEach(([code, quote]) => {
          const countryData = countries.find(c => c.code === code);
          const verified = countryData ? countryData.content.includes(quote) : false;
          verifiedCountryObj[code] = { quote, verified };
        });
        return verifiedCountryObj;
      })
    }))
  };

  const outputPath = path.join(__dirname, '..', 'results', 'analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(verifiedResult, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(console.error);