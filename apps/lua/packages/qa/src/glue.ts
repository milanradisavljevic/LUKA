import type { DocumentV1, Meta, QuellText } from '@lehrunterlagen/schema';
import { renderDocument, renderRaster } from '@lehrunterlagen/renderer';
import { generateDocument, type BlockRequest, type Provider, type ProviderConfig } from '@lehrunterlagen/llm';
import { buildRaster } from './korrekturraster/builder';

export interface GlueInput {
  meta: Meta;
  quelltexte: QuellText[];
  bloecke: BlockRequest[];
}

export interface GlueOk {
  ok: true;
  schueler: Buffer;
  loesung: Buffer;
  raster: Buffer;
  document: DocumentV1;
  versuche: number;
}

export interface GlueError {
  ok: false;
  fehler: string;
  versuche: number;
}

export type GlueResult = GlueOk | GlueError;

/**
 * End-to-end-Pipeline: Quelltexte + Baukasten-Vorgaben -> LLM -> Validierung -> 3x .docx
 *
 * `customProvider` ermoeglicht das Einschleusen eines Mock-Providers fuer Tests/CI.
 * Wenn gesetzt, wird der Provider aus der Registry uebergangen.
 */
export async function runPipeline(
  input: GlueInput,
  cfg: ProviderConfig,
  customProvider?: Provider,
): Promise<GlueResult> {
  let gen;
  try {
    if (customProvider) {
      const { buildMessages } = await import('@lehrunterlagen/llm');
      const { parseAndValidate } = await import('@lehrunterlagen/llm');
      const messages = buildMessages(input as any);
      const rohText = await customProvider.complete(messages, cfg, input as any);
      const validiert = await parseAndValidate(rohText, input.meta, input.quelltexte);
      if (!validiert.ok || !validiert.document) {
        return { ok: false, fehler: validiert.fehler ?? 'Mock lieferte ungueltiges Dokument', versuche: 1 };
      }
      gen = { ok: true as const, document: validiert.document, rohText, versuche: 1 };
    } else {
      gen = await generateDocument(input, cfg);
    }
  } catch (e) {
    return { ok: false, fehler: (e as Error).message, versuche: 0 };
  }

  if (!gen.ok) {
    return { ok: false, fehler: gen.fehler, versuche: gen.versuche };
  }

  const rasterData = buildRaster(gen.document);
  const [docResult, rasterBuf] = await Promise.all([
    renderDocument(gen.document),
    renderRaster(rasterData),
  ]);

  return {
    ok: true,
    schueler: docResult.schueler,
    loesung: docResult.loesung,
    raster: rasterBuf,
    document: gen.document,
    versuche: gen.versuche,
  };
}
