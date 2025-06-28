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
  countryPositions: {
    topic: string;
    countries: [{ [countryCode: string]: { summarised_stance_in_english: string; exact_quote: string } }];
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
  const systemPrompt = `You are a diplomatic analyst specializing in identifying clear positions expressed by countries on major global issues. Your task is to analyze foreign ministry website content and identify SPECIFIC STANCES where countries express clear opinions.

Focus on finding specific stances such as:
- UKRAINE CONFLICT: Support for Ukraine, condemnation of Russia, sanctions, military aid
- ISRAEL/GAZA CONFLICT: Support for Israel, support for Palestinians, ceasefire calls, humanitarian aid
- IRAN: Nuclear program concerns, sanctions, diplomatic relations, regional tensions
- CLIMATE CHANGE: Paris Agreement, net zero commitments, climate finance, green transition
- HUMAN RIGHTS: Democracy promotion, authoritarian criticism, minority rights, women's rights

CRITICAL: Use EXACT quotes from the input text. Do NOT add trailing periods, punctuation, or modify the text in any way. Copy the text exactly as it appears in the source material.

Return ONLY valid JSON in this exact structure:
{
  "countryPositions": [
    {
      "topic": "<Topic name (e.g., Ukraine Conflict, Climate Change, etc.)>",
      "countries": [
        { "<2 digit ISO country code>": {
          "exact_quote": "<exact quote in original language from input conveying their opinion>",
          "summarised_stance_in_english": "<stance always in english>",
          "relevance_to_topic": <0-1 score for how relevant the quote is to the topic>,
          "clarity_of_stance": <0-1 score for how clear/unambiguous the country's position is>
        }}
      ]
    }
  ]
}

Here is an example
{
  "countryPositions": [
    {
      "topic": "Iran",
      "countries": [
        {
          "EG": {
            "exact_quote": "رحب الوزيران باتفاق وقف إطلاق النار الذى أعلن عنه الرئيس الامريكى أمس بين إيران وإسرائيل",
            "summarised_stance_in_english": "Welcomes the ceasefire between Iran and Israel",
            "relevance_to_topic": 0.9,
            "clarity_of_stance": 0.8
          }
        },
        {
          "JP": {
            "exact_quote": "U.S. Strikes on Iranian Nuclear Facilities (Statement by Foreign Minister IWAYA Takeshi)",
            "summarised_stance_in_english": "Unspecified stance on U.S. Strikes on Iranian Nuclear Facilities",
            "relevance_to_topic": 0.7,
            "clarity_of_stance": 0.3
          }
        }
      ]
    }
  ]
}

Include any clear positions expressed by countries on these topics. Be specific and factual.`;

  const userPrompt = `Analyze the following foreign ministry website content from ${countries.length} countries:

${countries.map(c => `--- ${c.code} ---\n${c.content.slice(0, 40_000)}`).join('\n\n')}`;

  console.log(`Sending ${countries.length} countries to GPT-4o...`);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,
    max_tokens: 10_000,
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
    console.log('Parsed successfully. Positions:', parsed.countryPositions?.length || 0);
    
    return {
      countryPositions: parsed.countryPositions || [],
      dataContext: parsed.dataContext || `Analysis based on ${countries.length} foreign ministry websites scraped on 2025-06-28. Content represents official diplomatic positions and priorities as published on government websites.`
    };
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    console.error('Raw response:', jsonResponse.slice(0, 500));
    return {
      countryPositions: [],
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

  const lengths = countries.map(c => c.content.length).sort((a, b) => a - b);
  const mid = Math.floor(lengths.length / 2);
  const median = lengths.length % 2 ? lengths[mid] : (lengths[mid - 1] + lengths[mid]) / 2;
  console.log(`Min: ${lengths[0]}, Max: ${lengths[lengths.length - 1]}, Median: ${median}`);

  console.log('\nAnalyzing with GPT-4o...');
  const result = await analyzeWithGPT4o(countries);

  console.log('\n=== ANALYSIS RESULTS ===\n');
  console.log('DATA CONTEXT:');
  console.log(result.dataContext);
  
  console.log('\nCOUNTRY POSITIONS:');
  result.countryPositions.forEach((position, i) => {
    console.log(`\n${i + 1}. ${position.topic}`);
    console.log(`   Countries:`);
    position.countries.forEach(countryObj => {
      Object.entries(countryObj).forEach(([code, countryData]) => {
        // Verify if the quote actually exists in the country's content
        const sourceData = countries.find(c => c.code === code);
        const quoteStr = countryData.exact_quote;
        const stance = countryData.summarised_stance_in_english;
        const relevance = (countryData as any).relevance_to_topic || 0;
        const clarity = (countryData as any).clarity_of_stance || 0;
        const scores = `R:${relevance} C:${clarity}`;
        
        if (!sourceData) {
          console.log(`     \x1b[31m${code}: "${stance}" | "${quoteStr}" | ${scores} ✗ (no data)\x1b[0m`);
          return;
        }
        
        const content = sourceData.content;
        const exactMatch = content.includes(quoteStr);
        
        if (exactMatch) {
          console.log(`     \x1b[32m${code}: "${stance}" | "${quoteStr}" | ${scores} ✓\x1b[0m`);
        } else {
          // Check for partial matches (first half or last half)
          const halfLength = Math.floor(quoteStr.length / 2);
          const firstHalf = quoteStr.substring(0, halfLength);
          const lastHalf = quoteStr.substring(halfLength);
          
          const firstHalfMatch = firstHalf.length > 10 && content.includes(firstHalf);
          const lastHalfMatch = lastHalf.length > 10 && content.includes(lastHalf);
          
          if (firstHalfMatch || lastHalfMatch) {
            const matchType = firstHalfMatch && lastHalfMatch ? 'both halves' :
                             firstHalfMatch ? 'first half' : 'last half';
            console.log(`     \x1b[33m${code}: "${stance}" | "${quoteStr}" | ${scores} ~ (${matchType})\x1b[0m`);
          } else {
            console.log(`     \x1b[31m${code}: "${stance}" | "${quoteStr}" | ${scores} ✗\x1b[0m`);
          }
        }
      });
    });
  });

  // Save results with verification status
  const verifiedResult = {
    ...result,
    countryPositions: result.countryPositions.map(position => ({
      ...position,
      countries: position.countries.map(countryObj => {
        const verifiedCountryObj: { [key: string]: { summarised_stance_in_english: string; exact_quote: string; relevance_to_topic: number; clarity_of_stance: number; verification: string; verified: boolean } } = {};
        Object.entries(countryObj).forEach(([code, countryData]) => {
          const sourceData = countries.find(c => c.code === code);
          const quoteStr = countryData.exact_quote;
          const stance = countryData.summarised_stance_in_english;
          const relevance = (countryData as any).relevance_to_topic || 0;
          const clarity = (countryData as any).clarity_of_stance || 0;
          
          if (!sourceData) {
            verifiedCountryObj[code] = {
              summarised_stance_in_english: stance,
              exact_quote: quoteStr,
              relevance_to_topic: relevance,
              clarity_of_stance: clarity,
              verification: 'no_data',
              verified: false
            };
            return;
          }
          
          const content = sourceData.content;
          const exactMatch = content.includes(quoteStr);
          
          if (exactMatch) {
            verifiedCountryObj[code] = {
              summarised_stance_in_english: stance,
              exact_quote: quoteStr,
              relevance_to_topic: relevance,
              clarity_of_stance: clarity,
              verification: 'exact_match',
              verified: true
            };
          } else {
            // Check for partial matches
            const halfLength = Math.floor(quoteStr.length / 2);
            const firstHalf = quoteStr.substring(0, halfLength);
            const lastHalf = quoteStr.substring(halfLength);
            
            const firstHalfMatch = firstHalf.length > 10 && content.includes(firstHalf);
            const lastHalfMatch = lastHalf.length > 10 && content.includes(lastHalf);
            
            if (firstHalfMatch || lastHalfMatch) {
              const matchType = firstHalfMatch && lastHalfMatch ? 'both_halves' :
                               firstHalfMatch ? 'first_half' : 'last_half';
              verifiedCountryObj[code] = {
                summarised_stance_in_english: stance,
                exact_quote: quoteStr,
                relevance_to_topic: relevance,
                clarity_of_stance: clarity,
                verification: `partial_match_${matchType}`,
                verified: false
              };
            } else {
              verifiedCountryObj[code] = {
                summarised_stance_in_english: stance,
                exact_quote: quoteStr,
                relevance_to_topic: relevance,
                clarity_of_stance: clarity,
                verification: 'no_match',
                verified: false
              };
            }
          }
        });
        return verifiedCountryObj;
      })
    }))
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, '..', 'results', `analysis_${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(verifiedResult, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(console.error);