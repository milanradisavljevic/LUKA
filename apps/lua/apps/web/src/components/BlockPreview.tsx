import type { Block, Fach } from '@lehrunterlagen/schema';
import { getBlockLabel } from '../lib/blockDefaults';
import { BlockPreviewLueckentext } from './BlockPreviewLueckentext';
import { BlockPreviewMatching } from './BlockPreviewMatching';
import { BlockPreviewMultipleChoice } from './BlockPreviewMultipleChoice';
import { BlockPreviewVerstaendnisfrage } from './BlockPreviewVerstaendnisfrage';
import { BlockPreviewSchreibaufgabe } from './BlockPreviewSchreibaufgabe';
import { BlockPreviewMarkieraufgabe } from './BlockPreviewMarkieraufgabe';
import { BlockPreviewWordScramble } from './BlockPreviewWordScramble';
import { BlockPreviewKategorisierung } from './BlockPreviewKategorisierung';
import { BlockPreviewTabelle } from './BlockPreviewTabelle';
import { BlockPreviewStiluebung } from './BlockPreviewStiluebung';
import { BlockPreviewSonganalyse } from './BlockPreviewSonganalyse';
import { BlockPreviewKreuzwortraetsel } from './BlockPreviewKreuzwortraetsel';
import { BlockPreviewWortgitter } from './BlockPreviewWortgitter';
import { BlockPreviewVokabeluebung } from './BlockPreviewVokabeluebung';
import { BlockPreviewFehlerkorrektur } from './BlockPreviewFehlerkorrektur';
import { BlockPreviewRoleplay } from './BlockPreviewRoleplay';
import { BlockPreviewQuellenanalyse } from './BlockPreviewQuellenanalyse';
import { BlockPreviewTimeline } from './BlockPreviewTimeline';
import { BlockPreviewDiagrammAnalyse } from './BlockPreviewDiagrammAnalyse';
import type { RenderLayout, RenderTemplate } from '@lehrunterlagen/renderer';

interface Props {
  block: Block;
  showSolution: boolean;
  solutionStep?: number;
  onUpdate?: (id: string, field: string, value: unknown) => void;
  template?: RenderTemplate;
  layout?: RenderLayout;
  /** Fach des Dokuments — steuert englische Renderer-Labels (z. B. Kreuzwort). */
  fach?: Fach;
}

export function BlockPreview({ block, showSolution, solutionStep, onUpdate, template, layout, fach }: Props) {
  const extraProps = {
    ...(onUpdate ? { onUpdate } : {}),
    ...(solutionStep !== undefined ? { solutionStep } : {}),
  };

  const pass = (C: React.ComponentType<{
    block: Block; showSolution: boolean;
    onUpdate?: (id: string, field: string, value: unknown) => void;
  }>) => (
    <C block={block} showSolution={showSolution} {...extraProps} />
  );

  switch (block.typ) {
    case 'lueckentext':
      return pass(BlockPreviewLueckentext);
    case 'matching':
      return pass(BlockPreviewMatching);
    case 'multipleChoice':
      return pass(BlockPreviewMultipleChoice);
    case 'offeneVerstaendnisfrage':
      return pass(BlockPreviewVerstaendnisfrage);
    case 'offeneSchreibaufgabe':
      return pass(BlockPreviewSchreibaufgabe);
    case 'markieraufgabe':
      return pass(BlockPreviewMarkieraufgabe);
    case 'wordScramble':
      return pass(BlockPreviewWordScramble);
    case 'kategorisierung':
      return pass(BlockPreviewKategorisierung);
    case 'tabelle':
      return pass(BlockPreviewTabelle);
    case 'stiluebung':
      return pass(BlockPreviewStiluebung);
    case 'songanalyse':
      return pass(BlockPreviewSonganalyse);
    case 'kreuzwortraetsel':
      return <BlockPreviewKreuzwortraetsel block={block} showSolution={showSolution} {...extraProps} template={template} layout={layout} fach={fach} />;
    case 'wortgitter':
      return <BlockPreviewWortgitter block={block} showSolution={showSolution} {...extraProps} template={template} layout={layout} />;
    case 'vokabeluebung':
      return pass(BlockPreviewVokabeluebung);
    case 'fehlerkorrektur':
      return pass(BlockPreviewFehlerkorrektur);
    case 'quellenanalyse':
      return pass(BlockPreviewQuellenanalyse);
    case 'timeline':
      return pass(BlockPreviewTimeline);
    case 'diagrammanalyse':
      return pass(BlockPreviewDiagrammAnalyse);
    case 'roleplay':
      return pass(BlockPreviewRoleplay);
    default:
      // Typ OHNE eigene Vorschau. Statt still nichts zu rendern (das war ein Loch
      // im Blatt, waehrend das DOCX den Block druckte) sagt die Vorschau, was gilt.
      return (
        <p style={{
          fontSize: '9pt', fontStyle: 'italic', color: '#888888',
          border: '1px dashed #cccccc', padding: '0.5rem 0.75rem', margin: '0 0 0.5rem',
        }}>
          Für „{getBlockLabel(block.typ)}" gibt es in der Vorschau keine Darstellung.
          Die Aufgabe wird im Export trotzdem gedruckt — bitte im DOCX prüfen.
        </p>
      );
  }
}
