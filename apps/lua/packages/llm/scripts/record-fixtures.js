#!/usr/bin/env node
/**
 * Record-Fixtures-Skript
 * 
 * Ruft alle 6 Anbieter mit einem einfachen Prompt auf und speichert
 * die Rohantworten als JSON-Fixtures für Integrationstests.
 * 
 * Verwendung:
 *   pnpm run record-fixtures
 * 
 * Benötigt API-Keys in src-tauri/.env.local
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECORDED_DIR = join(__dirname, '../src/__recorded__');

// Erstelle __recorded__-Verzeichnis falls nicht vorhanden
if (!existsSync(RECORDED_DIR)) {
  mkdirSync(RECORDED_DIR, { recursive: true });
}

const PROVIDERS = [
  { name: 'anthropic', model: 'claude-sonnet-4-6' },
  { name: 'openai', model: 'gpt-4o-mini' },
  { name: 'deepseek', model: 'deepseek-chat' },
  { name: 'mistral', model: 'mistral-large-latest' },
  { name: 'kimi', model: 'moonshot-v1-8k' },
  { name: 'qwen', model: 'qwen-plus' }
];

const BLOCK_TYPES = [
  'lueckentext',
  'matching',
  'multipleChoice',
  'offeneVerstaendnisfrage',
  'offeneSchreibaufgabe',
  'markieraufgabe'
];

const PROMPTS = {
  lueckentext: `Erstelle eine kurze Deutsch-Schularbeit (Oberstufe, 7. Klasse) zum Thema "Medienkonsum" mit genau einem Block:

Block-Typ: lueckentext
Punkte: 8
Anzahl Lücken: 4

Erstelle einen Lückentext mit 4 nummerierten Lücken (1), (2), (3), (4). Die Lösungswörter sollen aus dem Kontext ableitbar sein.

Antworte AUSSCHLIESSLICH mit dem vollständigen JSON-Objekt gemäß Schema. Keine Erklärung, kein Markdown.`,

  matching: `Erstelle eine kurze Deutsch-Schularbeit (Oberstufe, 7. Klasse) zum Thema "Rhetorische Mittel" mit genau einem Block:

Block-Typ: matching
Punkte: 6
Anzahl Items: 3

Erstelle 3 Items (rhetorische Mittel) und 4 Optionen (Definitionen). Die Reihenfolge der Optionen darf NICHT parallel zur Reihenfolge der Items sein.

Antworte AUSSCHLIESSLICH mit dem vollständigen JSON-Objekt gemäß Schema. Keine Erklärung, kein Markdown.`,

  multipleChoice: `Erstelle eine kurze Deutsch-Schularbeit (Oberstufe, 7. Klasse) zum Thema "Medienkonsum" mit genau einem Block:

Block-Typ: multipleChoice
Punkte: 4
Anzahl Fragen: 2

Erstelle 2 Multiple-Choice-Fragen mit je 4 Antwortoptionen (A-D). Jede Frage hat genau eine richtige Antwort.

Antworte AUSSCHLIESSLICH mit dem vollständigen JSON-Objekt gemäß Schema. Keine Erklärung, kein Markdown.`,

  offeneVerstaendnisfrage: `Erstelle eine kurze Deutsch-Schularbeit (Oberstufe, 7. Klasse) zum Thema "Medienkonsum" mit genau einem Block:

Block-Typ: offeneVerstaendnisfrage
Punkte: 8
Anzahl Fragen: 2

Erstelle 2 offene Verständnisfragen zum Thema. Die Musterantworten sollten knapp und schülernah sein (2-3 Sätze).

Antworte AUSSCHLIESSLICH mit dem vollständigen JSON-Objekt gemäß Schema. Keine Erklärung, kein Markdown.`,

  offeneSchreibaufgabe: `Erstelle eine kurze Deutsch-Schularbeit (Oberstufe, 7. Klasse) zum Thema "Medienkonsum" mit genau einem Block:

Block-Typ: offeneSchreibaufgabe
Punkte: 20
Textsorte: Kommentar
Umfang: 250-300 Wörter

Erstelle eine offene Schreibaufgabe mit Situation, Textsorte, Umfang und 3 Aspekten. Die Musterlösung sollte auf Sehr-gut-Niveau einer Schülerin der 7. Klasse sein.

Antworte AUSSCHLIESSLICH mit dem vollständigen JSON-Objekt gemäß Schema. Keine Erklärung, kein Markdown.`,

  markieraufgabe: `Erstelle eine kurze Deutsch-Schularbeit (Oberstufe, 7. Klasse) zum Thema "Medienkonsum" mit genau einem Block:

Block-Typ: markieraufgabe
Punkte: 4
Quelltext: "Die Generation Z wächst mit digitalen Medien auf. Smartphones, soziale Netzwerke und Streaming-Dienste sind fester Bestandteil ihres Alltags. Kritiker warnen vor Suchtgefahr und Realitätsverlust, während Befürworter die Chancen für Bildung und Vernetzung betonen."

Erstelle eine Markieraufgabe, bei der alle Argumente PRO digitale Medien markiert werden sollen.

Antworte AUSSCHLIESSLICH mit dem vollständigen JSON-Objekt gemäß Schema. Keine Erklärung, kein Markdown.`
};

async function recordProvider(provider, blockType) {
  console.log(`\n📝 Recording ${provider.name} (${provider.model}) - ${blockType}...`);
  
  const prompt = PROMPTS[blockType];
  if (!prompt) {
    console.log(`  ⚠️  No prompt found for block type ${blockType}, skipping`);
    return false;
  }
  
  try {
    // Lade API-Key aus .env.local
    const envPath = join(__dirname, '../../../src-tauri/.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const envLines = envContent.split('\n');
    let apiKey = null;
    
    for (const line of envLines) {
      if (line.startsWith(`${provider.name.toUpperCase()}_API_KEY=`)) {
        apiKey = line.split('=')[1].trim();
        break;
      }
    }
    
    if (!apiKey) {
      console.log(`  ⚠️  No API key found for ${provider.name}, skipping`);
      return false;
    }
    
    // Erstelle Request basierend auf Provider
    let url, headers, body;
    
    if (provider.name === 'anthropic') {
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      body = {
        model: provider.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      };
    } else {
      // OpenAI-kompatible APIs
      const baseUrls = {
        openai: 'https://api.openai.com/v1',
        deepseek: 'https://api.deepseek.com/v1',
        mistral: 'https://api.mistral.ai/v1',
        kimi: 'https://api.moonshot.ai/v1',
        qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      };
      
      url = `${baseUrls[provider.name]}/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      body = {
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.7
      };
    }
    
    // Sende Request
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  ❌ Error ${response.status}: ${errorText.substring(0, 100)}`);
      return false;
    }
    
    const data = await response.json();
    
    // Extrahiere Antwort
    let rawResponse;
    if (provider.name === 'anthropic') {
      rawResponse = data.content[0].text;
    } else {
      rawResponse = data.choices[0].message.content;
    }
    
    // Speichere Fixture
    const fixturePath = join(RECORDED_DIR, `${provider.name}_${blockType}.json`);
    writeFileSync(fixturePath, JSON.stringify({
      provider: provider.name,
      model: provider.model,
      blockType,
      timestamp: new Date().toISOString(),
      rawResponse,
      fullApiResponse: data
    }, null, 2));
    
    console.log(`  ✅ Saved to ${fixturePath}`);
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🎬 Recording API fixtures for all providers and block types...\n');
  console.log(`Recorded directory: ${RECORDED_DIR}`);
  console.log(`Providers: ${PROVIDERS.length}`);
  console.log(`Block types: ${BLOCK_TYPES.length}`);
  console.log(`Total fixtures to record: ${PROVIDERS.length * BLOCK_TYPES.length}\n`);
  
  let successCount = 0;
  let totalCount = 0;
  
  for (const provider of PROVIDERS) {
    for (const blockType of BLOCK_TYPES) {
      totalCount++;
      const success = await recordProvider(provider, blockType);
      if (success) successCount++;
      
      // Kleine Pause, um Rate-Limits zu vermeiden
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n✨ Done! Recorded ${successCount}/${totalCount} fixtures`);
}

main().catch(console.error);
