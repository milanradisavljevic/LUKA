import type { DocumentV1, Block } from '@lehrunterlagen/schema';

// ---------------------------------------------------------------------------
// GIFT Format Export
// ---------------------------------------------------------------------------

// GIFT special characters that need escaping
const GIFT_SPECIAL_CHARS = /([~=#{}:\n])/g;

function escapeGift(text: string): string {
  return text.replace(GIFT_SPECIAL_CHARS, '\\$1').replace(/\\n/g, '\\n');
}

function escapeGiftText(text: string): string {
  return text.replace(/\n/g, ' ').replace(/([~=#{}:])/g, '\\$1');
}

// ---------------------------------------------------------------------------
// Block Converters
// ---------------------------------------------------------------------------

function convertMultipleChoice(block: Block & { typ: 'multipleChoice' }): string {
  const questions: string[] = [];

  for (const frage of block.config.fragen) {
    const correctKeys = block.loesung.antworten[String(frage.nr)] ?? [];
    const options = frage.optionen.map((opt) => {
      const isCorrect = correctKeys.includes(opt.key);
      const escapedText = escapeGiftText(opt.text);
      return isCorrect ? `=${escapedText}` : `~${escapedText}`;
    });

    const title = escapeGiftText(`Frage ${frage.nr}`);
    const questionText = escapeGiftText(frage.frage);
    questions.push(`::${title}::${questionText}{${options.join(' ')}}`);
  }

  return questions.join('\n\n');
}

function convertMatching(block: Block & { typ: 'matching' }): string {
  const pairs: string[] = [];

  for (const item of block.config.items) {
    const correctOption = block.loesung.zuordnung[String(item.nr)];
    if (correctOption) {
      const left = escapeGiftText(item.prompt);
      const right = escapeGiftText(correctOption);
      pairs.push(`=${left} -> ${right}`);
    }
  }

  if (pairs.length === 0) return '';

  const title = escapeGiftText(block.arbeitsanweisung.slice(0, 50));
  return `::${title}::{${pairs.join(' ')}}`;
}

function convertLueckentext(block: Block & { typ: 'lueckentext' }): string {
  if (!block.text || block.loesung.luecken.length === 0) return '';

  let text = block.text;
  const sortedLuecken = [...block.loesung.luecken].sort((a, b) => b.nr - a.nr);

  for (const luecke of sortedLuecken) {
    const placeholder = new RegExp(`\\[${luecke.nr}\\]|_{2,}`, 'g');
    const replacement = `{=${escapeGiftText(luecke.wort)}}`;
    text = text.replace(placeholder, replacement);
  }

  const title = escapeGiftText(block.arbeitsanweisung.slice(0, 50));
  return `::${title}::${text}`;
}

function convertKategorisierung(block: Block & { typ: 'kategorisierung' }): string {
  const pairs: string[] = [];

  for (const item of block.config.items) {
    const kategorien = block.loesung.zuordnung[String(item.nr)];
    if (kategorien && kategorien.length > 0) {
      const left = escapeGiftText(item.text);
      const right = escapeGiftText(kategorien[0]!);
      pairs.push(`=${left} -> ${right}`);
    }
  }

  if (pairs.length === 0) return '';

  const title = escapeGiftText(block.arbeitsanweisung.slice(0, 50));
  return `::${title}::{${pairs.join(' ')}}`;
}

function convertFehlerkorrektur(block: Block & { typ: 'fehlerkorrektur' }): string {
  const questions: string[] = [];

  for (const satz of block.config.saetze) {
    const korrektur = block.loesung.korrekturen.find((k) => k.nr === satz.nr);
    if (korrektur) {
      const title = escapeGiftText(`Satz ${satz.nr}`);
      const questionText = escapeGiftText(satz.satz);
      const answer = escapeGiftText(korrektur.korrigierterSatz);
      questions.push(`::${title}::${questionText}{=${answer}}`);
    }
  }

  return questions.join('\n\n');
}

function convertUmformung(block: Block & { typ: 'umformung' }): string {
  const questions: string[] = [];

  for (const aufgabe of block.config.aufgaben) {
    const loesung = block.loesung.loesungen.find((l) => l.nr === aufgabe.nr);
    if (loesung) {
      const title = escapeGiftText(`Umformung ${aufgabe.nr}`);
      const questionText = escapeGiftText(`${aufgabe.ausgangssatz}\n${aufgabe.anweisung}`);
      const answer = escapeGiftText(loesung.umformulierung);
      questions.push(`::${title}::${questionText}{=${answer}}`);
    }
  }

  return questions.join('\n\n');
}

function convertToEssay(block: Block): string {
  const title = escapeGiftText(block.arbeitsanweisung.slice(0, 50));
  const questionText = escapeGiftText(block.arbeitsanweisung);
  return `::${title}::${questionText}{}`;
}

// ---------------------------------------------------------------------------
// Main Converter
// ---------------------------------------------------------------------------

function convertBlockToGift(block: Block): string {
  switch (block.typ) {
    case 'multipleChoice':
      return convertMultipleChoice(block);
    case 'matching':
      return convertMatching(block);
    case 'lueckentext':
      return convertLueckentext(block);
    case 'kategorisierung':
      return convertKategorisierung(block);
    case 'fehlerkorrektur':
      return convertFehlerkorrektur(block);
    case 'umformung':
      return convertUmformung(block);
    case 'offeneVerstaendnisfrage':
    case 'offeneSchreibaufgabe':
    case 'markieraufgabe':
    case 'wordScramble':
    case 'tabelle':
    case 'stiluebung':
    case 'songanalyse':
    case 'kreuzwortraetsel':
    case 'wortgitter':
    case 'vokabeluebung':
    case 'roleplay':
    case 'rollenkartenSet':
      return convertToEssay(block);
    default:
      return convertToEssay(block);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function toGift(doc: DocumentV1): string {
  const header = `// GIFT Export aus LUKA\n// Thema: ${doc.meta.thema}\// Fach: ${doc.meta.fach} | Stufe: ${doc.meta.stufe}\n// Datum: ${doc.meta.datum}\n\n`;

  const questions = doc.bloecke
    .map((block, index) => {
      const converted = convertBlockToGift(block);
      if (!converted) return null;
      return `// Aufgabe ${index + 1}: ${block.typ}\n${converted}`;
    })
    .filter((q): q is string => q !== null);

  return header + questions.join('\n\n');
}

// ---------------------------------------------------------------------------
// Moodle XML Export
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function convertMultipleChoiceToXml(block: Block & { typ: 'multipleChoice' }, index: number): string {
  const questions: string[] = [];

  for (const frage of block.config.fragen) {
    const correctKeys = block.loesung.antworten[String(frage.nr)] ?? [];
    const name = `MC_${index}_${frage.nr}`;

    let xml = `<question type="multichoice">
  <name><text>${escapeXml(name)}</text></name>
  <questiontext format="html"><text><![CDATA[<p>${escapeXml(frage.frage)}</p>]]></text></questiontext>`;

    for (const opt of frage.optionen) {
      const isCorrect = correctKeys.includes(opt.key);
      const fraction = isCorrect ? 100 : 0;
      xml += `
  <answer fraction="${fraction}" format="html"><text><![CDATA[${escapeXml(opt.text)}]]></text></answer>`;
    }

    xml += '\n</question>';
    questions.push(xml);
  }

  return questions.join('\n');
}

function convertMatchingToXml(block: Block & { typ: 'matching' }, index: number): string {
  const pairs: string[] = [];

  for (const item of block.config.items) {
    const correctOption = block.loesung.zuordnung[String(item.nr)];
    if (correctOption) {
      pairs.push(`  <subquestion><text>${escapeXml(item.prompt)}</text></subquestion>
  <subanswer><text>${escapeXml(correctOption)}</text></subanswer>`);
    }
  }

  if (pairs.length === 0) return '';

  const name = `Matching_${index}`;
  return `<question type="matching">
  <name><text>${escapeXml(name)}</text></name>
  <questiontext format="html"><text><![CDATA[<p>${escapeXml(block.arbeitsanweisung)}</p>]]></text></questiontext>
${pairs.join('\n')}
</question>`;
}

function convertLueckentextToXml(block: Block & { typ: 'lueckentext' }, index: number): string {
  if (!block.text || block.loesung.luecken.length === 0) return '';

  let text = block.text;
  for (const luecke of block.loesung.luecken) {
    const placeholder = new RegExp(`\\[${luecke.nr}\\]|_{2,}`, 'g');
    text = text.replace(placeholder, `{${luecke.wort}}`);
  }

  const name = `Cloze_${index}`;
  return `<question type="cloze">
  <name><text>${escapeXml(name)}</text></name>
  <questiontext format="html"><text><![CDATA[<p>${escapeXml(text)}</p>]]></text></questiontext>
</question>`;
}

function convertKategorisierungToXml(block: Block & { typ: 'kategorisierung' }, index: number): string {
  return convertMatchingToXml(
    {
      ...block,
      typ: 'matching',
      config: {
        items: block.config.items.map((item) => ({ nr: item.nr, prompt: item.text })),
        optionen: block.config.kategorien.map((k) => ({ key: k.name, text: k.name })),
      },
      loesung: {
        zuordnung: Object.fromEntries(
          Object.entries(block.loesung.zuordnung).map(([k, v]) => [k, v[0] ?? '']),
        ),
      },
    },
    index,
  );
}

function convertShortAnswerToXml(block: Block, index: number | string, questionText: string, answer: string): string {
  const name = `ShortAnswer_${index}`;
  return `<question type="shortanswer">
  <name><text>${escapeXml(name)}</text></name>
  <questiontext format="html"><text><![CDATA[<p>${escapeXml(questionText)}</p>]]></text></questiontext>
  <answer fraction="100" format="html"><text><![CDATA[${escapeXml(answer)}]]></text></answer>
</question>`;
}

function convertFehlerkorrekturToXml(block: Block & { typ: 'fehlerkorrektur' }, index: number): string {
  const questions: string[] = [];

  for (const satz of block.config.saetze) {
    const korrektur = block.loesung.korrekturen.find((k) => k.nr === satz.nr);
    if (korrektur) {
      questions.push(convertShortAnswerToXml(block, `${index}_${satz.nr}`, satz.satz, korrektur.korrigierterSatz));
    }
  }

  return questions.join('\n');
}

function convertUmformungToXml(block: Block & { typ: 'umformung' }, index: number): string {
  const questions: string[] = [];

  for (const aufgabe of block.config.aufgaben) {
    const loesung = block.loesung.loesungen.find((l) => l.nr === aufgabe.nr);
    if (loesung) {
      const questionText = `${aufgabe.ausgangssatz}\n${aufgabe.anweisung}`;
      questions.push(convertShortAnswerToXml(block, `${index}_${aufgabe.nr}`, questionText, loesung.umformulierung));
    }
  }

  return questions.join('\n');
}

function convertToEssayXml(block: Block, index: number): string {
  const name = `Essay_${index}`;
  return `<question type="essay">
  <name><text>${escapeXml(name)}</text></name>
  <questiontext format="html"><text><![CDATA[<p>${escapeXml(block.arbeitsanweisung)}</p>]]></text></questiontext>
  <generalfeedback format="html"><text><![CDATA[<p>${escapeXml(block.arbeitsanweisung)}</p>]]></text></generalfeedback>
</question>`;
}

function convertBlockToMoodleXml(block: Block, index: number): string {
  switch (block.typ) {
    case 'multipleChoice':
      return convertMultipleChoiceToXml(block, index);
    case 'matching':
      return convertMatchingToXml(block, index);
    case 'lueckentext':
      return convertLueckentextToXml(block, index);
    case 'kategorisierung':
      return convertKategorisierungToXml(block, index);
    case 'fehlerkorrektur':
      return convertFehlerkorrekturToXml(block, index);
    case 'umformung':
      return convertUmformungToXml(block, index);
    default:
      return convertToEssayXml(block, index);
  }
}

export function toMoodleXml(doc: DocumentV1): string {
  const questions = doc.bloecke
    .map((block, index) => convertBlockToMoodleXml(block, index + 1))
    .filter((q) => q.length > 0);

  return `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
${questions.join('\n')}
</quiz>`;
}
