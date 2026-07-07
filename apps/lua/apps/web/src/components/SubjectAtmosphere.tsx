import type { CSSProperties, ReactNode } from 'react';
import type { Fach } from '@lehrunterlagen/schema';
import deutschLiteratureLineart from '../assets/subject-atmospheres/deutsch/literature-goethe-schiller-lineart-cluster.webp';
import englischLineart from '../assets/subject-atmospheres/englisch/english-bigben-lineart-cluster.webp';
import ethikLineart from '../assets/subject-atmospheres/ethik/ethics-lineart-cluster.webp';
import franzoesischLineart from '../assets/subject-atmospheres/franzoesisch/french-lineart-cluster.webp';
import geographieAtlasLineart from '../assets/subject-atmospheres/geographie/atlas-lineart-cluster.webp';
import geschichteArchiveLineart from '../assets/subject-atmospheres/geschichte/archive-lineart-cluster.webp';
import italienischLineart from '../assets/subject-atmospheres/italienisch/italian-lineart-cluster.webp';
import lateinLineart from '../assets/subject-atmospheres/latein/latin-lineart-cluster.webp';
import philosophieNeutralLineart from '../assets/subject-atmospheres/philosophie/neutral-lineart-cluster.webp';
import psychologieLineart from '../assets/subject-atmospheres/psychologie/psychology-lineart-cluster.webp';
import religionLineart from '../assets/subject-atmospheres/religion/religion-lineart-cluster.webp';
import spanischLineart from '../assets/subject-atmospheres/spanisch/spanish-lineart-cluster.webp';

type FieldFamily = 'text' | 'language' | 'archive' | 'map' | 'logic' | 'values' | 'psyche' | 'sacred' | 'classic';

type Motif =
  | 'alhambra'
  | 'bigBen'
  | 'cathedral'
  | 'compass'
  | 'crescentLotus'
  | 'dante'
  | 'ethics'
  | 'featherBook'
  | 'fleur'
  | 'globe'
  | 'goethe'
  | 'gondolaViolin'
  | 'history'
  | 'kant'
  | 'marianne'
  | 'owl'
  | 'psychology'
  | 'quixote'
  | 'romanBust'
  | 'sacredCluster'
  | 'spqrTablet'
  | 'theatre'
  | 'thinker'
  | 'topography';

type MotifRole = 'hero' | 'support' | 'trace';
type AssetRole = 'neutral' | 'portrait' | 'support';

interface MotifPlacement {
  motif: Motif;
  role: MotifRole;
  style: CSSProperties;
  mirror?: boolean;
}

interface AssetPlacement {
  src: string;
  alt: string;
  role: AssetRole;
  style: CSSProperties;
}

interface SubjectAtmosphereSpec {
  field: FieldFamily;
  motifs: MotifPlacement[];
  assets?: AssetPlacement[];
}

interface SubjectAtmosphereProps {
  fach: Fach;
  enabled: boolean;
  reduced?: boolean;
}

const WIDE = 'clamp(170px, 15vw, 250px)';
const TALL = 'clamp(190px, 17vw, 280px)';
const MEDIUM = 'clamp(120px, 11vw, 180px)';
const SMALL = 'clamp(82px, 8vw, 132px)';
const EDGE_SAFE_OFFSET = 'clamp(-96px, -4.5vw, -32px)';
const EDGE_SAFE_BOTTOM = 'clamp(12px, 1.8vh, 34px)';
const EDGE_SAFE_WIDTH = 'clamp(700px, 58vw, 1040px)';

const SUBJECT_ATMOSPHERES: Record<Fach, SubjectAtmosphereSpec> = {
  deutsch: {
    field: 'text',
    motifs: [],
    assets: [
      {
        src: deutschLiteratureLineart,
        alt: '',
        role: 'neutral',
        style: {
          left: 'clamp(-440px, -24vw, -230px)',
          bottom: 'clamp(-18px, -2vh, 22px)',
          width: 'clamp(660px, 56vw, 1040px)',
          transform: 'rotate(-1.5deg)',
        },
      },
    ],
  },
  englisch: {
    field: 'language',
    motifs: [],
    assets: [
      {
        src: englischLineart,
        alt: '',
        role: 'neutral',
        style: {
          right: 'clamp(-150px, -7vw, -64px)',
          bottom: 'clamp(-24px, -3vh, 12px)',
          width: 'clamp(700px, 58vw, 1040px)',
          transform: 'rotate(0.5deg)',
        },
      },
    ],
  },
  franzoesisch: {
    field: 'language',
    motifs: [],
    assets: [
      {
        src: franzoesischLineart,
        alt: '',
        role: 'neutral',
        style: {
          left: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(-0.5deg)',
        },
      },
    ],
  },
  spanisch: {
    field: 'language',
    motifs: [],
    assets: [
      {
        src: spanischLineart,
        alt: '',
        role: 'neutral',
        style: {
          right: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(0.75deg)',
        },
      },
    ],
  },
  italienisch: {
    field: 'language',
    motifs: [],
    assets: [
      {
        src: italienischLineart,
        alt: '',
        role: 'neutral',
        style: {
          left: 'clamp(-450px, -25vw, -235px)',
          bottom: 'clamp(-32px, -3vh, 10px)',
          width: 'clamp(690px, 59vw, 1080px)',
          transform: 'rotate(-0.75deg)',
        },
      },
    ],
  },
  latein: {
    field: 'classic',
    motifs: [],
    assets: [
      {
        src: lateinLineart,
        alt: '',
        role: 'neutral',
        style: {
          right: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(0.5deg)',
        },
      },
    ],
  },
  geschichte: {
    field: 'archive',
    motifs: [],
    assets: [
      {
        src: geschichteArchiveLineart,
        alt: '',
        role: 'neutral',
        style: {
          left: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(-1deg)',
        },
      },
    ],
  },
  geographie: {
    field: 'map',
    motifs: [],
    assets: [
      {
        src: geographieAtlasLineart,
        alt: '',
        role: 'neutral',
        style: {
          right: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(1deg)',
        },
      },
    ],
  },
  religion: {
    field: 'sacred',
    motifs: [],
    assets: [
      {
        src: religionLineart,
        alt: '',
        role: 'neutral',
        style: {
          left: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(-0.5deg)',
        },
      },
    ],
  },
  ethik: {
    field: 'values',
    motifs: [],
    assets: [
      {
        src: ethikLineart,
        alt: '',
        role: 'neutral',
        style: {
          right: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(0.5deg)',
        },
      },
    ],
  },
  psychologie: {
    field: 'psyche',
    motifs: [],
    assets: [
      {
        src: psychologieLineart,
        alt: '',
        role: 'neutral',
        style: {
          left: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(-0.5deg)',
        },
      },
    ],
  },
  philosophie: {
    field: 'logic',
    motifs: [],
    assets: [
      {
        src: philosophieNeutralLineart,
        alt: '',
        role: 'neutral',
        style: {
          right: EDGE_SAFE_OFFSET,
          bottom: EDGE_SAFE_BOTTOM,
          width: EDGE_SAFE_WIDTH,
          transform: 'rotate(0.5deg)',
        },
      },
    ],
  },
  // Neue AHS-Pflichtfächer ab 2026/27 -- noch keine eigene Lineart-Illustration
  // (Entwurfsstand, siehe docs/PLAN-neue-faecher-2026-07.md); nur das Feld-Linienmuster,
  // keine Assets, bis eigenes Artwork existiert.
  mediendemokratie: {
    field: 'archive',
    motifs: [],
  },
  informatikki: {
    field: 'logic',
    motifs: [],
  },
};

const FALLBACK: SubjectAtmosphereSpec = {
  field: 'text',
  motifs: [
    { motif: 'featherBook', role: 'hero', style: { left: '4%', top: '12%', width: WIDE, transform: 'rotate(-4deg)' } },
    { motif: 'compass', role: 'support', style: { right: '4%', bottom: '10%', width: MEDIUM, transform: 'rotate(6deg)' } },
  ],
};

export function SubjectAtmosphere({ fach, enabled, reduced = false }: SubjectAtmosphereProps) {
  if (!enabled) return null;

  const spec = SUBJECT_ATMOSPHERES[fach] ?? FALLBACK;
  const motifs = reduced
    ? spec.motifs.filter((motif) => motif.role === 'hero').slice(0, 1)
    : spec.motifs;
  const assets = reduced
    ? (spec.assets ?? []).filter((asset) => asset.role === 'neutral' || asset.role === 'portrait').slice(0, 1)
    : (spec.assets ?? []);

  return (
    <div
      className={reduced ? 'subject-atmosphere subject-atmosphere--reduced' : 'subject-atmosphere'}
      data-family={spec.field}
      data-assets={assets.length > 0 ? 'true' : undefined}
      aria-hidden="true"
    >
      <svg className="subject-atmosphere__field" viewBox="0 0 1200 900" preserveAspectRatio="none">
        <FieldLines family={spec.field} />
      </svg>
      {assets.map((placement, index) => (
        <AssetCanvas key={`${placement.src}-${index}`} placement={placement} />
      ))}
      {motifs.map((placement, index) => (
        <MotifCanvas key={`${placement.motif}-${index}`} placement={placement} />
      ))}
    </div>
  );
}

function AssetCanvas({ placement }: { placement: AssetPlacement }) {
  return (
    <img
      className={`subject-atmosphere__asset subject-atmosphere__asset--${placement.role}`}
      src={placement.src}
      alt={placement.alt}
      style={placement.style}
      draggable={false}
    />
  );
}

function MotifCanvas({ placement }: { placement: MotifPlacement }) {
  return (
    <svg
      className={`subject-atmosphere__motif subject-atmosphere__motif--${placement.role}`}
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      style={placement.style}
    >
      <g transform={placement.mirror ? 'translate(200 0) scale(-1 1)' : undefined}>
        <MotifIcon motif={placement.motif} />
      </g>
    </svg>
  );
}

function FieldLines({ family }: { family: FieldFamily }) {
  switch (family) {
    case 'map':
      return (
        <g>
          <path d="M0 180 C150 92 270 116 396 78 S650 42 780 116 S1010 228 1200 150" />
          <path d="M0 256 C128 196 270 206 410 168 S620 134 760 198 S1030 304 1200 250" />
          <path d="M700 690 C835 608 950 642 1080 584 S1160 524 1200 544" />
          <path d="M760 760 C910 716 1060 734 1200 688" />
        </g>
      );
    case 'logic':
      return (
        <g>
          <path d="M72 210 L232 116 L366 234 L190 334 Z" />
          <path d="M860 126 L1016 64 L1136 172" />
          <path d="M92 646 C220 540 374 548 492 656" />
          <circle cx="226" cy="118" r="7" />
          <circle cx="1016" cy="64" r="7" />
          <path d="M844 722 C948 628 1076 634 1170 724" />
        </g>
      );
    case 'sacred':
      return (
        <g>
          <path d="M70 132 C170 232 170 358 70 458" />
          <path d="M302 132 C202 232 202 358 302 458" />
          <path d="M882 140 C1000 244 1000 370 882 474" />
          <path d="M1142 140 C1024 244 1024 370 1142 474" />
          <path d="M110 710 C250 610 398 616 528 718" />
          <path d="M760 712 C900 610 1054 610 1180 714" />
        </g>
      );
    case 'archive':
      return (
        <g>
          <path d="M72 150 H356" />
          <path d="M118 214 H330" />
          <path d="M76 704 C198 628 338 640 442 718" />
          <path d="M822 164 H1160" />
          <path d="M872 230 H1124" />
          <path d="M746 704 C882 626 1044 634 1180 724" />
        </g>
      );
    case 'values':
      return (
        <g>
          <path d="M84 194 C206 116 350 128 454 220" />
          <path d="M88 664 C206 566 364 586 462 688" />
          <path d="M742 198 C880 110 1054 124 1166 224" />
          <path d="M760 668 C906 560 1058 584 1180 690" />
        </g>
      );
    case 'psyche':
      return (
        <g>
          <path d="M64 182 C152 82 250 202 344 110 S500 108 570 202" />
          <path d="M70 650 C170 548 282 692 392 580 S536 564 612 670" />
          <path d="M760 184 C870 80 972 206 1084 112 S1150 86 1200 146" />
          <path d="M760 708 C886 608 1020 720 1160 622" />
        </g>
      );
    case 'classic':
      return (
        <g>
          <path d="M40 160 H360" />
          <path d="M72 222 H328" />
          <path d="M48 704 H390" />
          <path d="M800 160 H1160" />
          <path d="M846 222 H1120" />
          <path d="M790 704 H1170" />
          <path d="M120 346 C230 288 352 292 460 350" />
        </g>
      );
    case 'language':
      return (
        <g>
          <path d="M36 168 C122 108 232 132 316 178 S500 198 602 132" />
          <path d="M72 696 H330" />
          <path d="M742 158 C854 96 970 144 1068 106 S1160 90 1200 122" />
          <path d="M780 704 H1160" />
        </g>
      );
    case 'text':
    default:
      return (
        <g>
          <path d="M58 154 H330" />
          <path d="M94 212 H390" />
          <path d="M76 270 H290" />
          <path d="M94 668 C204 604 346 614 454 688" />
          <path d="M800 154 H1160" />
          <path d="M850 214 H1190" />
          <path d="M760 668 C896 594 1050 606 1180 690" />
        </g>
      );
  }
}

function MotifIcon({ motif }: { motif: Motif }) {
  switch (motif) {
    case 'alhambra': return <MotifAlhambra />;
    case 'bigBen': return <MotifBigBen />;
    case 'cathedral': return <MotifCathedral />;
    case 'compass': return <MotifCompass />;
    case 'crescentLotus': return <MotifCrescentLotus />;
    case 'dante': return <MotifDante />;
    case 'ethics': return <MotifEthics />;
    case 'featherBook': return <MotifFeatherBook />;
    case 'fleur': return <MotifFleur />;
    case 'globe': return <MotifGlobe />;
    case 'goethe': return <MotifGoethe />;
    case 'gondolaViolin': return <MotifGondolaViolin />;
    case 'history': return <MotifHistory />;
    case 'kant': return <MotifKant />;
    case 'marianne': return <MotifMarianne />;
    case 'owl': return <MotifOwl />;
    case 'psychology': return <MotifPsychology />;
    case 'quixote': return <MotifQuixote />;
    case 'romanBust': return <MotifRomanBust />;
    case 'sacredCluster': return <MotifSacredCluster />;
    case 'spqrTablet': return <MotifSpqrTablet />;
    case 'theatre': return <MotifTheatre />;
    case 'thinker': return <MotifThinker />;
    case 'topography': return <MotifTopography />;
  }
}

function Hatch({ children }: { children: ReactNode }) {
  return <g className="subject-atmosphere__hatch">{children}</g>;
}

function MotifCompass() {
  return (
    <>
      <circle cx="100" cy="100" r="72" />
      <circle cx="100" cy="100" r="58" />
      <circle cx="100" cy="100" r="10" />
      <path d="M100 28 L113 88 L172 100 L113 112 L100 172 L87 112 L28 100 L87 88 Z" />
      <path d="M100 42 L123 77 L158 100 L123 123 L100 158 L77 123 L42 100 L77 77 Z" />
      <path d="M100 28 V172 M28 100 H172 M49 49 L151 151 M151 49 L49 151" />
      <path d="M96 21 H104 M96 179 H104 M21 96 V104 M179 96 V104" />
      <path d="M93 14 C102 8 116 10 126 18" />
      <Hatch>
        <path d="M106 47 L116 86 M119 84 L151 96 M115 116 L106 154 M84 115 L49 104" />
        <path d="M90 48 L82 84 M82 84 L50 96 M84 116 L92 154 M116 84 L150 96" />
      </Hatch>
    </>
  );
}

function MotifGlobe() {
  return (
    <>
      <ellipse cx="100" cy="82" rx="70" ry="64" />
      <path d="M30 82 H170 M100 18 C74 42 72 122 100 146 C128 122 126 42 100 18" />
      <path d="M48 42 C78 56 122 56 152 42 M42 122 C78 108 122 108 158 122" />
      <path d="M72 24 C58 54 58 112 74 140 M128 24 C142 54 142 112 126 140" />
      <path d="M78 60 C92 50 105 62 118 54 C126 50 136 52 144 60" />
      <path d="M58 96 C70 88 84 92 92 104 C102 118 116 112 124 124" />
      <path d="M116 72 C130 70 140 80 138 92 C136 108 152 108 158 118" />
      <path d="M100 146 V164 M64 176 H136 M76 164 C88 172 112 172 124 164" />
      <path d="M156 34 C176 52 182 92 170 122" />
      <Hatch>
        <path d="M66 64 L88 54 M72 70 L100 58 M86 110 L110 98 M126 84 L146 76" />
        <path d="M126 132 L142 124 M52 120 L72 112 M88 36 L110 32" />
      </Hatch>
    </>
  );
}

function MotifThinker() {
  return (
    <>
      <path d="M72 170 H156 L174 190 H54 V178 C54 173 60 170 72 170 Z" />
      <path d="M94 152 C78 142 72 126 80 110 C87 96 104 94 118 104" />
      <path d="M112 105 C130 116 134 138 124 154 C118 164 106 166 94 152" />
      <path d="M104 102 C111 86 122 74 136 68" />
      <path d="M136 68 C152 60 164 68 166 82 C168 94 158 103 146 100" />
      <path d="M142 86 C132 88 124 94 118 108" />
      <path d="M131 69 C128 58 132 46 143 41 C152 37 164 41 169 51" />
      <path d="M139 48 C148 43 158 45 164 53 C171 62 169 74 160 80" />
      <path d="M149 83 C142 94 132 106 124 122" />
      <path d="M90 151 C82 162 68 170 58 182" />
      <path d="M114 158 C124 166 136 172 150 178" />
      <path d="M78 112 C60 122 50 142 42 164" />
      <path d="M46 164 C60 162 74 158 88 150" />
      <path d="M130 150 C146 144 158 134 166 120" />
      <path d="M166 120 C172 128 172 142 166 154 C160 166 151 174 138 178" />
      <Hatch>
        <path d="M86 118 C98 116 110 120 120 130" />
        <path d="M84 130 C96 128 108 132 118 142" />
        <path d="M126 78 C136 72 146 70 156 74" />
        <path d="M64 150 C72 146 80 142 88 136" />
        <path d="M138 154 C148 148 156 140 162 130" />
      </Hatch>
    </>
  );
}

function MotifOwl() {
  return (
    <>
      <path d="M64 34 C78 48 92 46 100 38 C108 46 122 48 136 34 C154 62 154 108 138 146 C126 174 74 174 62 146 C46 108 46 62 64 34 Z" />
      <path d="M70 62 C82 48 98 56 100 76 C102 56 118 48 130 62" />
      <circle cx="82" cy="82" r="18" />
      <circle cx="118" cy="82" r="18" />
      <circle cx="82" cy="82" r="7" />
      <circle cx="118" cy="82" r="7" />
      <path d="M100 91 L90 112 H110 Z" />
      <path d="M70 118 C86 132 114 132 130 118" />
      <path d="M72 132 C86 146 114 146 128 132" />
      <path d="M72 152 C82 160 92 162 100 158 C108 162 118 160 128 152" />
      <path d="M62 146 L42 166 M138 146 L158 166" />
      <Hatch>
        <path d="M62 58 C72 70 73 96 66 120 M138 58 C128 70 127 96 134 120" />
        <path d="M80 132 L74 150 M92 138 L90 158 M108 138 L110 158 M120 132 L126 150" />
      </Hatch>
    </>
  );
}

function MotifGoethe() {
  return (
    <>
      <path d="M72 36 C88 20 126 22 142 43 C154 58 152 84 140 98" />
      <path d="M70 42 C54 54 48 76 54 96 C58 110 66 124 64 142" />
      <path d="M83 58 C96 50 118 52 130 64 C140 74 140 91 130 104" />
      <path d="M82 73 C72 86 70 106 78 122 C84 136 99 142 116 138" />
      <path d="M116 138 C132 132 142 116 140 98" />
      <path d="M92 84 C101 78 112 78 121 84" />
      <path d="M91 93 C101 98 114 98 124 92" />
      <path d="M78 104 C88 104 96 108 101 116" />
      <path d="M101 116 C94 124 84 126 76 120" />
      <path d="M118 138 C128 150 144 158 164 164" />
      <path d="M78 136 C66 148 56 160 48 178" />
      <path d="M44 178 C70 168 120 168 160 180" />
      <path d="M56 72 C40 78 34 92 38 110 C42 128 54 136 66 132" />
      <Hatch>
        <path d="M76 44 C92 32 120 34 138 48" />
        <path d="M72 52 C90 42 118 44 134 58" />
        <path d="M64 62 C78 54 98 54 112 62" />
        <path d="M130 68 C142 76 144 88 138 100" />
        <path d="M86 150 C106 154 126 158 146 168" />
      </Hatch>
    </>
  );
}

function MotifDante() {
  return (
    <>
      <path d="M58 68 C72 32 126 26 154 60 C160 76 150 94 136 104" />
      <path d="M70 54 C88 36 122 36 144 58" />
      <path d="M62 72 C54 96 62 126 82 144 C100 158 126 154 142 136" />
      <path d="M82 78 C96 72 110 72 122 80" />
      <path d="M82 92 C96 98 112 98 126 92" />
      <path d="M76 106 C84 106 92 110 98 118" />
      <path d="M98 118 C94 126 86 130 78 126" />
      <path d="M140 76 C156 88 160 112 148 132" />
      <path d="M84 146 C74 158 66 170 60 188" />
      <path d="M118 150 C134 162 150 174 166 188" />
      <path d="M52 68 C84 48 118 46 152 60" />
      <path d="M58 64 C72 74 84 78 100 76" />
      <Hatch>
        <path d="M68 58 L82 32 M82 56 L96 28 M98 54 L112 28 M116 56 L130 34 M134 62 L148 44" />
        <path d="M76 158 C96 166 118 166 140 158" />
      </Hatch>
    </>
  );
}

function MotifKant() {
  return (
    <>
      <path d="M68 42 C88 22 126 24 146 50" />
      <path d="M72 52 C62 70 64 100 82 118 C96 132 122 130 138 112" />
      <path d="M82 70 C96 62 114 62 130 72" />
      <path d="M82 82 C96 88 114 88 130 82" />
      <path d="M102 92 C94 100 86 104 76 102" />
      <path d="M82 120 C76 138 66 152 52 168" />
      <path d="M120 122 C136 136 152 148 170 160" />
      <path d="M50 170 H176" />
      <Hatch>
        <path d="M72 48 C92 38 122 40 144 54" />
        <path d="M70 58 C92 50 116 52 138 64" />
        <path d="M92 136 C108 142 126 142 144 136" />
      </Hatch>
    </>
  );
}

function MotifMarianne() {
  return (
    <>
      <path d="M62 72 C82 34 132 28 158 62 C164 82 154 108 136 120" />
      <path d="M78 52 C102 38 132 42 154 64" />
      <path d="M66 78 C58 102 68 130 90 146 C108 158 132 150 146 132" />
      <path d="M82 84 C94 78 110 78 124 86" />
      <path d="M82 96 C96 102 112 102 126 96" />
      <path d="M82 116 C92 118 102 122 108 130" />
      <path d="M64 70 L44 56 L76 58" />
      <path d="M118 44 L154 28 L142 64" />
      <path d="M92 150 C82 162 72 174 66 190" />
      <path d="M130 146 C146 158 160 172 170 190" />
      <Hatch>
        <path d="M68 64 C90 54 124 56 150 70" />
        <path d="M76 58 C82 72 88 84 96 96" />
        <path d="M98 44 C108 62 118 78 130 92" />
        <path d="M128 42 C136 56 142 70 146 86" />
      </Hatch>
    </>
  );
}

function MotifFeatherBook() {
  return (
    <>
      <path d="M132 28 C86 36 50 78 44 150 C88 138 132 86 132 28 Z" />
      <path d="M48 148 C72 108 94 72 132 28" />
      <path d="M76 100 L52 94 M88 82 L64 74 M104 62 L78 54 M66 122 L48 118" />
      <path d="M24 132 C50 116 72 120 100 138 V184 C72 168 50 164 24 178 Z" />
      <path d="M176 132 C150 116 128 120 100 138 V184 C128 168 150 164 176 178 Z" />
      <path d="M42 144 H78 M122 144 H158 M42 156 H82 M118 156 H160 M42 168 H72 M128 168 H158" />
    </>
  );
}

function MotifTheatre() {
  return (
    <>
      <path d="M36 140 C54 92 94 70 138 82 C162 90 176 112 176 140" />
      <path d="M46 140 H168" />
      <path d="M58 140 V116 C58 100 72 92 88 92 C104 92 116 102 116 118 V140" />
      <path d="M124 140 V118 C124 104 136 98 148 98 C160 98 168 106 168 120 V140" />
      <path d="M38 154 C76 168 124 168 176 154" />
      <path d="M72 66 C84 56 104 56 116 66" />
      <path d="M64 58 C78 42 112 42 126 58" />
      <Hatch>
        <path d="M52 132 H166 M68 116 H108 M132 124 H160" />
        <path d="M46 144 L38 160 M72 146 L64 166 M102 148 L98 168 M132 146 L136 166 M160 144 L174 160" />
      </Hatch>
    </>
  );
}

function MotifBigBen() {
  return (
    <>
      <path d="M76 184 V62 L100 30 L124 62 V184" />
      <path d="M66 184 H134 M70 62 H130 M80 50 H120" />
      <circle cx="100" cy="82" r="18" />
      <path d="M100 82 V70 M100 82 L110 88" />
      <path d="M84 108 H116 M84 124 H116 M84 140 H116 M84 156 H116" />
      <path d="M88 62 V184 M112 62 V184" />
      <path d="M100 30 V18 M92 18 H108" />
      <Hatch>
        <path d="M78 66 L88 58 M112 58 L122 66 M78 176 L122 166" />
        <path d="M86 92 H114 M86 100 H114" />
      </Hatch>
    </>
  );
}

function MotifCathedral() {
  return (
    <>
      <path d="M38 184 V80 L100 28 L162 80 V184" />
      <path d="M72 184 V126 C72 104 128 104 128 126 V184" />
      <path d="M100 28 V12 M88 18 H112" />
      <path d="M54 184 V100 C54 86 72 86 72 100 V184" />
      <path d="M128 184 V100 C128 86 146 86 146 100 V184" />
      <path d="M52 82 H148 M62 66 H138" />
      <path d="M86 86 C86 70 114 70 114 86 V112 H86 Z" />
      <path d="M26 184 H174" />
      <Hatch>
        <path d="M42 92 L64 72 M158 92 L136 72 M82 138 H118 M80 154 H120" />
        <path d="M94 86 V112 M106 86 V112 M60 112 H70 M130 112 H142" />
      </Hatch>
    </>
  );
}

function MotifFleur() {
  return (
    <>
      <path d="M100 28 C72 64 76 94 100 116 C124 94 128 64 100 28 Z" />
      <path d="M100 116 C68 90 38 100 30 140 C62 142 84 132 100 116 Z" />
      <path d="M100 116 C132 90 162 100 170 140 C138 142 116 132 100 116 Z" />
      <path d="M100 116 V180 M66 148 H134" />
      <path d="M76 164 C88 172 112 172 124 164" />
      <Hatch>
        <path d="M92 54 C84 74 88 94 100 110 M108 54 C116 74 112 94 100 110" />
        <path d="M48 128 C66 124 82 120 98 112 M152 128 C134 124 118 120 102 112" />
      </Hatch>
    </>
  );
}

function MotifQuixote() {
  return (
    <>
      <path d="M66 136 C88 118 118 118 144 136 C132 154 86 154 66 136 Z" />
      <path d="M74 136 C78 154 86 166 98 174" />
      <path d="M134 136 C138 152 146 164 158 174" />
      <path d="M100 116 C94 98 104 84 122 82 C138 82 148 94 146 110" />
      <path d="M122 82 C116 66 122 50 140 44" />
      <path d="M138 44 C154 52 158 66 150 80" />
      <path d="M118 108 L86 84" />
      <path d="M86 84 L36 22" />
      <path d="M126 116 L156 96" />
      <path d="M64 144 C44 144 34 136 30 120" />
      <path d="M70 128 C52 116 40 120 34 136" />
      <Hatch>
        <path d="M86 136 C98 130 114 130 130 136" />
        <path d="M112 88 C122 94 132 102 142 112" />
        <path d="M46 38 L64 60 M58 34 L76 56" />
      </Hatch>
    </>
  );
}

function MotifAlhambra() {
  return (
    <>
      <path d="M28 184 V80 C28 42 64 28 100 28 C136 28 172 42 172 80 V184" />
      <path d="M48 184 V88 C48 62 72 50 100 50 C128 50 152 62 152 88 V184" />
      <path d="M72 184 V112 C72 94 88 86 100 86 C112 86 128 94 128 112 V184" />
      <path d="M28 184 H172 M38 72 H162 M48 96 H152" />
      <path d="M58 120 H142 M58 144 H142" />
      <Hatch>
        <path d="M40 82 C54 70 68 70 82 82 C96 70 110 70 124 82 C138 70 152 70 166 82" />
        <path d="M42 176 L62 156 M72 176 L92 156 M108 176 L128 156 M138 176 L158 156" />
      </Hatch>
    </>
  );
}

function MotifGondolaViolin() {
  return (
    <>
      <path d="M28 134 C68 164 132 164 174 132 C140 144 68 144 28 134 Z" />
      <path d="M52 132 C78 108 126 108 150 132" />
      <path d="M102 72 C124 86 138 108 140 134" />
      <path d="M42 166 C60 154 78 174 96 162 C112 152 132 170 152 158" />
      <path d="M58 62 C42 54 44 34 62 30 C78 26 88 42 80 58 C102 50 122 58 122 78 C122 98 96 102 86 82" />
      <path d="M82 60 L146 24 M138 28 L160 16" />
      <path d="M76 54 C90 62 98 72 102 88" />
      <Hatch>
        <path d="M62 136 C88 128 116 128 144 136" />
        <path d="M54 42 C64 38 74 42 78 52 M94 64 C106 64 116 70 120 80" />
      </Hatch>
    </>
  );
}

function MotifRomanBust() {
  return (
    <>
      <path d="M120 28 C88 20 62 42 64 78 C66 108 90 122 118 108" />
      <path d="M116 54 C134 60 138 84 122 96" />
      <path d="M76 54 C88 44 104 42 120 48" />
      <path d="M82 78 C94 84 110 84 124 78" />
      <path d="M90 112 C74 122 60 136 50 158 H154 C148 138 132 122 112 112" />
      <path d="M74 158 C92 170 116 170 138 158" />
      <path d="M42 182 H164" />
      <Hatch>
        <path d="M72 44 C84 34 104 32 122 40" />
        <path d="M72 58 C88 50 106 50 124 58" />
        <path d="M76 138 C96 146 118 146 140 138" />
        <path d="M82 154 L72 178 M102 158 L98 182 M122 154 L134 178" />
      </Hatch>
    </>
  );
}

function MotifSpqrTablet() {
  return (
    <>
      <rect x="54" y="36" width="92" height="112" rx="10" />
      <path d="M66 58 H134 M66 82 H134 M66 106 H118" />
      <path d="M74 130 C90 122 110 122 126 130" />
      <path d="M38 40 V180" />
      <path d="M38 46 H158 L142 72 L158 98 H38" />
      <path d="M66 64 H130 M66 78 H116" />
      <path d="M60 174 H126" />
      <Hatch>
        <path d="M58 42 L74 148 M82 36 L96 148 M108 36 L122 148 M132 40 L144 134" />
      </Hatch>
    </>
  );
}

function MotifHistory() {
  return (
    <>
      <path d="M34 100 H170" />
      <circle cx="54" cy="100" r="12" />
      <circle cx="100" cy="100" r="12" />
      <circle cx="146" cy="100" r="12" />
      <path d="M54 88 V50 M100 112 V158 M146 88 V48" />
      <path d="M34 44 C58 34 80 38 102 50 C124 62 148 58 172 44 V84 C148 98 124 98 102 86 C80 74 58 74 34 84 Z" />
      <path d="M58 134 L76 150 L58 166 L40 150 Z" />
      <path d="M128 136 C118 146 116 166 136 174 C156 166 154 146 144 136 Z" />
      <Hatch>
        <path d="M46 58 H78 M90 64 H126 M136 58 H160" />
        <path d="M46 148 H70 M126 148 H150 M132 158 H154" />
      </Hatch>
    </>
  );
}

function MotifSacredCluster() {
  return (
    <>
      <path d="M58 28 V112 M34 58 H82" />
      <path d="M116 42 V120" />
      <path d="M88 116 C88 84 100 72 116 72 C132 72 144 84 144 116" />
      <path d="M100 116 C100 94 106 86 116 86 C126 86 132 94 132 116" />
      <path d="M76 138 C96 126 114 128 132 140 V180 C114 168 96 166 76 178 Z" />
      <path d="M168 138 C148 126 132 128 132 140 V180 C148 168 158 166 174 176" />
      <path d="M96 148 H122 M142 148 H162 M96 160 H120 M144 160 H160" />
      <Hatch>
        <path d="M94 100 H138 M94 88 H138 M104 76 V116 M128 76 V116" />
      </Hatch>
    </>
  );
}

function MotifCrescentLotus() {
  return (
    <>
      <path d="M132 34 C84 44 66 102 104 146 C68 136 44 104 52 70 C60 38 94 18 132 34 Z" />
      <path d="M146 58 L152 74 L168 74 L155 84 L160 100 L146 90 L132 100 L138 84 L124 74 L140 74 Z" />
      <path d="M98 116 C82 138 82 158 100 178 C118 158 118 138 98 116 Z" />
      <path d="M72 130 C74 156 88 174 100 180 C96 154 86 138 72 130 Z" />
      <path d="M126 130 C124 156 112 174 100 180 C104 154 112 138 126 130 Z" />
      <path d="M54 158 C72 178 90 186 100 180 C82 158 68 154 54 158 Z" />
      <path d="M146 158 C128 178 110 186 100 180 C118 158 132 154 146 158 Z" />
    </>
  );
}

function MotifEthics() {
  return (
    <>
      <path d="M100 34 V144 M70 62 H130" />
      <path d="M70 62 L48 118 H92 Z" />
      <path d="M130 62 L108 118 H152 Z" />
      <path d="M42 118 C52 130 80 130 92 118" />
      <path d="M108 118 C120 130 144 130 154 118" />
      <path d="M58 162 C82 132 118 132 142 162" />
      <path d="M66 162 H134 M76 162 V146 M100 162 V138 M124 162 V146" />
      <path d="M56 44 C66 34 82 34 92 44 C82 54 66 54 56 44 Z" />
      <path d="M144 44 C134 34 118 34 108 44 C118 54 134 54 144 44 Z" />
      <Hatch>
        <path d="M54 108 H86 M114 108 H146 M72 150 H128" />
      </Hatch>
    </>
  );
}

function MotifPsychology() {
  return (
    <>
      <path d="M66 144 C42 132 34 104 46 82 C34 62 48 34 74 42 C84 24 114 24 126 44 C154 46 170 72 158 98 C166 126 144 152 116 144" />
      <path d="M100 40 V166" />
      <path d="M66 76 C82 66 94 74 100 92" />
      <path d="M134 76 C118 66 106 74 100 92" />
      <path d="M68 116 C84 112 94 122 100 138" />
      <path d="M132 116 C116 112 106 122 100 138" />
      <path d="M28 172 C52 134 82 134 100 172 C118 134 148 134 172 172" />
      <path d="M54 174 H146" />
      <circle cx="38" cy="40" r="6" />
      <circle cx="166" cy="46" r="6" />
      <circle cx="156" cy="146" r="6" />
      <path d="M44 44 L66 72 M160 52 L134 78 M150 144 L128 124" />
      <Hatch>
        <path d="M62 92 C78 86 92 92 100 106 M138 92 C122 86 108 92 100 106" />
        <path d="M76 130 C88 128 96 136 100 146 M124 130 C112 128 104 136 100 146" />
      </Hatch>
    </>
  );
}

function MotifTopography() {
  return (
    <>
      <path d="M24 66 C58 24 124 22 178 56" />
      <path d="M18 94 C66 44 134 50 184 90" />
      <path d="M24 124 C70 88 132 90 178 126" />
      <path d="M40 154 C78 130 126 132 164 160" />
      <path d="M76 94 C92 78 118 80 132 98" />
      <path d="M82 122 C98 112 116 114 128 128" />
      <path d="M44 44 C56 52 70 52 82 44" />
      <path d="M144 70 C154 78 166 78 178 70" />
    </>
  );
}
