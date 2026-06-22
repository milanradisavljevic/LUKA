import type { Block } from '@lehrunterlagen/schema';
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

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreview({ block, showSolution, onUpdate }: Props) {
  const pass = (C: React.ComponentType<{
    block: Block; showSolution: boolean;
    onUpdate?: (id: string, field: string, value: unknown) => void;
  }>) => (
    <C block={block} showSolution={showSolution}
      {...(onUpdate ? { onUpdate } : {})} />
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
      return pass(BlockPreviewKreuzwortraetsel);
    case 'wortgitter':
      return pass(BlockPreviewWortgitter);
    case 'vokabeluebung':
      return pass(BlockPreviewVokabeluebung);
    case 'fehlerkorrektur':
      return pass(BlockPreviewFehlerkorrektur);
    case 'roleplay':
      return pass(BlockPreviewRoleplay);
  }
}
