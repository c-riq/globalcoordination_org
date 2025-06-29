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
  timestamp: string;
  url: string;
}

interface TopicAnalysisResult {
  topic: string;
  countries: { [countryCode: string]: {
    summarised_stance_in_english: string;
    exact_quote: string;
    relevance_to_topic: number;
    clarity_of_stance: number;
    verification: string;
    verified: boolean;
    source_timestamp: string;
    source_url: string;
  } }[];
  dataContext: string;
  analysisTimestamp: string;
  sourceDataTimestamp: string;
}

interface CombinedAnalysisResult {
  countryPositions: {
    topic: string;
    countries: [{ [countryCode: string]: {
      summarised_stance_in_english: string;
      exact_quote: string;
      relevance_to_topic: number;
      clarity_of_stance: number;
      verification: string;
      verified: boolean;
      source_timestamp: string;
      source_url: string;
    } }];
  }[];
  dataContext: string;
  analysisTimestamp: string;
  topicAnalysisFiles: string[];
}

async function loadTxtFiles(): Promise<CountryContent[]> {
  const resultsDir = path.join(__dirname, '..', 'results', '2025-06-28');
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.txt'));
  
  return files.map(file => {
    const code = file.replace('.txt', '');
    const content = fs.readFileSync(path.join(resultsDir, file), 'utf8');
    
    // Load metadata from corresponding JSON file
    const jsonFile = path.join(resultsDir, `${code}.json`);
    let timestamp = new Date().toISOString();
    let url = '';
    
    if (fs.existsSync(jsonFile)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        timestamp = metadata.timestamp || timestamp;
        url = metadata.url || '';
      } catch (error) {
        console.warn(`Failed to parse metadata for ${code}:`, error);
      }
    }
    
    return {
      code,
      content,
      timestamp,
      url
    };
  });
}

const TOPICS = [
  { name: "Ukraine Conflict", description: "Support for Ukraine, condemnation of Russia, sanctions, military aid" },
  { name: "Israel/Gaza Conflict", description: "Support for Israel, support for Palestinians, ceasefire calls, humanitarian aid" },
  { name: "Iran", description: "Nuclear program concerns, sanctions, diplomatic relations, regional tensions" },
  { name: "Climate Change", description: "Paris Agreement, net zero commitments, climate finance, green transition" },
  { name: "Human Rights", description: "Democracy promotion, authoritarian criticism, minority rights, women's rights" },
  { name: "Sanctions", description: "Economic sanctions, trade restrictions, financial penalties, embargo measures" },
  { name: "Tariffs", description: "Trade tariffs, customs duties, import taxes, trade barriers, protectionist measures" },
  { name: "Artificial Intelligence", description: "AI governance, regulation, ethics, development policies, international cooperation" }
];

async function analyzeTopicWithGPT4o(countries: CountryContent[], topic: { name: string; description: string }): Promise<TopicAnalysisResult> {
  const systemPrompt = `You are a diplomatic analyst specializing in identifying clear positions expressed by countries on ${topic.name}. Your task is to analyze foreign ministry website content and identify SPECIFIC STANCES where countries express clear opinions on this topic ONLY.

Focus EXCLUSIVELY on finding specific stances related to ${topic.name}:
${topic.description}

CRITICAL: Use EXACT quotes from the input text. Do NOT add trailing periods, punctuation, or modify the text in any way. Copy the text exactly as it appears in the source material.

Return ONLY valid JSON in this exact structure:
{
  "countryPositions": [
    {
      "topic": "${topic.name}",
      "countries": [
        { "<2 digit ISO country code>": {
          "exact_quote": "<exact quote in original language from input conveying their opinion>",
          "summarised_stance_in_english": "<stance always in english>",
          "relevance_to_topic": <0-1 score for how relevant the quote is to ${topic.name}>,
          "clarity_of_stance": <0-1 score for how clear/unambiguous the country's position is>
        }}
      ]
    }
  ]
}

Only include positions that are clearly related to ${topic.name}. Be specific and factual.`;

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
    
    const analysisTimestamp = new Date().toISOString();
    const sourceDataTimestamp = countries.length > 0 ? countries[0].timestamp : analysisTimestamp;
    
    return {
      topic: topic.name,
      countries: parsed.countryPositions?.[0]?.countries || [],
      dataContext: parsed.dataContext || `Analysis of ${topic.name} based on ${countries.length} foreign ministry websites scraped on 2025-06-28. Content represents official diplomatic positions and priorities as published on government websites.`,
      analysisTimestamp,
      sourceDataTimestamp
    };
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    console.error('Raw response:', jsonResponse.slice(0, 500));
    const analysisTimestamp = new Date().toISOString();
    const sourceDataTimestamp = countries.length > 0 ? countries[0].timestamp : analysisTimestamp;
    
    return {
      topic: topic.name,
      countries: [],
      dataContext: `Analysis failed - JSON parsing error. Raw response: ${jsonResponse.slice(0, 200)}...`,
      analysisTimestamp,
      sourceDataTimestamp
    };
  }
}

async function saveTopicAnalysis(topicResult: TopicAnalysisResult, countries: CountryContent[]): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const topicSlug = topicResult.topic.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const outputPath = path.join(__dirname, '..', 'results', `topic_${topicSlug}_${timestamp}.json`);
  
  // Add verification and source metadata to each country position
  const verifiedResult = {
    ...topicResult,
    countries: topicResult.countries.map(countryObj => {
      const verifiedCountryObj: { [key: string]: any } = {};
      Object.entries(countryObj).forEach(([code, countryData]: [string, any]) => {
        const sourceData = countries.find(c => c.code === code);
        const quoteStr = countryData.exact_quote;
        const stance = countryData.summarised_stance_in_english;
        const relevance = countryData.relevance_to_topic || 0;
        const clarity = countryData.clarity_of_stance || 0;
        
        if (!sourceData) {
          verifiedCountryObj[code] = {
            summarised_stance_in_english: stance,
            exact_quote: quoteStr,
            relevance_to_topic: relevance,
            clarity_of_stance: clarity,
            verification: 'no_data',
            verified: false,
            source_timestamp: '',
            source_url: ''
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
            verified: true,
            source_timestamp: sourceData.timestamp,
            source_url: sourceData.url
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
              verified: false,
              source_timestamp: sourceData.timestamp,
              source_url: sourceData.url
            };
          } else {
            verifiedCountryObj[code] = {
              summarised_stance_in_english: stance,
              exact_quote: quoteStr,
              relevance_to_topic: relevance,
              clarity_of_stance: clarity,
              verification: 'no_match',
              verified: false,
              source_timestamp: sourceData.timestamp,
              source_url: sourceData.url
            };
          }
        }
      });
      return verifiedCountryObj;
    })
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(verifiedResult, null, 2));
  console.log(`Topic analysis saved: ${outputPath}`);
  return outputPath;
}

function getExistingTopicFiles(): string[] {
  const resultsDir = path.join(__dirname, '..', 'results');
  const files = fs.readdirSync(resultsDir).filter(f => f.startsWith('topic_') && f.endsWith('.json'));
  return files;
}

function getTopicSlug(topicName: string): string {
  return topicName.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

async function analyzeAllTopics(countries: CountryContent[]): Promise<string[]> {
  const topicFiles: string[] = [];
  const existingFiles = getExistingTopicFiles();
  const existingTopics = new Set(existingFiles.map(f => f.split('_').slice(1, -1).join('_')));
  
  for (const topic of TOPICS) {
    const topicSlug = getTopicSlug(topic.name);
    
    if (existingTopics.has(topicSlug)) {
      const existingFile = existingFiles.find(f => f.includes(topicSlug));
      if (existingFile) {
        const fullPath = path.join(__dirname, '..', 'results', existingFile);
        console.log(`\nSkipping topic: ${topic.name} (already exists: ${existingFile})`);
        topicFiles.push(fullPath);
        continue;
      }
    }
    
    console.log(`\nAnalyzing topic: ${topic.name}`);
    const result = await analyzeTopicWithGPT4o(countries, topic);
    const filePath = await saveTopicAnalysis(result, countries);
    topicFiles.push(filePath);
  }
  
  return topicFiles;
}

async function combineTopicAnalyses(topicFiles: string[]): Promise<CombinedAnalysisResult> {
  const countryPositions: any[] = [];
  
  for (const filePath of topicFiles) {
    try {
      const topicData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      countryPositions.push({
        topic: topicData.topic,
        countries: topicData.countries
      });
    } catch (error) {
      console.error(`Failed to read topic file ${filePath}:`, error);
    }
  }
  
  return {
    countryPositions,
    dataContext: `Comprehensive analysis across ${TOPICS.length} topics with incremental updates support. Each topic analyzed separately and combined.`,
    analysisTimestamp: new Date().toISOString(),
    topicAnalysisFiles: topicFiles.map(f => path.basename(f))
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable required');
    process.exit(1);
  }

  console.log('Loading .txt files...');
  const countries = await loadTxtFiles();
  console.log(`Loaded ${countries.length} country files`);

  console.log('\nAnalyzing topics separately...');
  const topicFiles = await analyzeAllTopics(countries);

  console.log('\nCombining topic analyses...');
  const combinedResult = await combineTopicAnalyses(topicFiles);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, '..', 'results', `combined_analysis_${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(combinedResult, null, 2));
  
  console.log(`\nCombined analysis saved to: ${outputPath}`);
  console.log(`Individual topic files: ${topicFiles.length}`);
  console.log('Topic files saved for incremental updates');
}

main().catch(console.error);