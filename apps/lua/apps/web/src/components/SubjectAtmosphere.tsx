import type { CSSProperties } from 'react';
import type { Fach } from '@lehrunterlagen/schema';
import teacherDeskLineart from '../assets/subject-atmospheres/neutral/teacher-desk-lineart-cluster.webp';
import deutschLiteratureLineart from '../assets/subject-atmospheres/deutsch/literature-goethe-schiller-lineart-cluster.webp';
import englischLineart from '../assets/subject-atmospheres/englisch/english-bigben-lineart-cluster.webp';
import ethikLineart from '../assets/subject-atmospheres/ethik/ethics-lineart-cluster.webp';
import franzoesischLineart from '../assets/subject-atmospheres/franzoesisch/french-lineart-cluster.webp';
import geographieAtlasLineart from '../assets/subject-atmospheres/geographie/atlas-lineart-cluster.webp';
import geschichteArchiveLineart from '../assets/subject-atmospheres/geschichte/archive-lineart-cluster.webp';
import informatikkiLineart from '../assets/subject-atmospheres/informatikki/informatics-ai-lineart-cluster.webp';
import italienischLineart from '../assets/subject-atmospheres/italienisch/italian-lineart-cluster.webp';
import lateinLineart from '../assets/subject-atmospheres/latein/latin-lineart-cluster.webp';
import mediendemokratieLineart from '../assets/subject-atmospheres/mediendemokratie/media-democracy-lineart-cluster.webp';
import philosophieNeutralLineart from '../assets/subject-atmospheres/philosophie/neutral-lineart-cluster.webp';
import psychologieLineart from '../assets/subject-atmospheres/psychologie/psychology-lineart-cluster.webp';
import religionLineart from '../assets/subject-atmospheres/religion/religion-lineart-cluster.webp';
import spanischLineart from '../assets/subject-atmospheres/spanisch/spanish-lineart-cluster.webp';

type FieldFamily = 'text' | 'language' | 'archive' | 'map' | 'logic' | 'values' | 'psyche' | 'sacred' | 'classic';

type AssetRole = 'neutral' | 'start' | 'portrait' | 'support';

interface AssetPlacement {
  src: string;
  alt: string;
  role: AssetRole;
  style: CSSProperties;
}

interface SubjectAtmosphereSpec {
  field: FieldFamily;
  assets?: AssetPlacement[];
}

type AtmosphereSubject = Fach | 'neutral';

interface SubjectAtmosphereProps {
  fach: AtmosphereSubject;
  enabled: boolean;
  reduced?: boolean;
}

const EDGE_SAFE_OFFSET = 'clamp(-96px, -4.5vw, -32px)';
const EDGE_SAFE_BOTTOM = 'clamp(12px, 1.8vh, 34px)';
const EDGE_SAFE_WIDTH = 'clamp(700px, 58vw, 1040px)';

const NEUTRAL_ATMOSPHERE: SubjectAtmosphereSpec = {
  field: 'text',
  assets: [
    {
      // Freigestelltes Bleistift-Stillleben (transparentes WebP, Tinte schwarz
      // wie die Fach-Assets — Sepia/Dark-Mode kommen aus murals.css).
      // Unten rechts verankert, blutet leicht über den Rand.
      src: teacherDeskLineart,
      alt: '',
      role: 'start',
      style: {
        right: 'clamp(-140px, -5vw, -32px)',
        bottom: 'clamp(-24px, -1.5vh, 0px)',
        width: 'clamp(680px, 56vw, 1060px)',
      },
    },
  ],
};

// Fächer ohne eigenes Motiv (und unbekannte Fächer) bekommen dasselbe
// Bleistift-Stillleben wie der Start, als „neutral“, damit es auch im
// reduzierten Modus sichtbar bleibt.
const SCHREIBTISCH_ATMOSPHERE: SubjectAtmosphereSpec = {
  field: 'text',
  assets: [{ ...NEUTRAL_ATMOSPHERE.assets![0]!, role: 'neutral' }],
};

const SUBJECT_ATMOSPHERES: Record<Fach, SubjectAtmosphereSpec> = {
  deutsch: {
    field: 'text',
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
  mediendemokratie: {
    field: 'archive',
    assets: [
      {
        src: mediendemokratieLineart,
        alt: '',
        role: 'neutral',
        style: {
          right: 'clamp(-250px, -11vw, -120px)',
          bottom: 'clamp(-28px, -2.6vh, 14px)',
          width: 'clamp(680px, 56vw, 1040px)',
          transform: 'rotate(0.5deg)',
        },
      },
    ],
  },
  informatikki: {
    field: 'logic',
    assets: [
      {
        src: informatikkiLineart,
        alt: '',
        role: 'neutral',
        style: {
          right: 'clamp(-250px, -11vw, -120px)',
          bottom: 'clamp(-28px, -2.6vh, 14px)',
          width: 'clamp(680px, 56vw, 1040px)',
          transform: 'rotate(0.4deg)',
        },
      },
    ],
  },
  daf: SCHREIBTISCH_ATMOSPHERE,
  mathematik: SCHREIBTISCH_ATMOSPHERE,
  biologie: SCHREIBTISCH_ATMOSPHERE,
};

export function SubjectAtmosphere({ fach, enabled, reduced = false }: SubjectAtmosphereProps) {
  if (!enabled) return null;

  const spec = fach === 'neutral' ? NEUTRAL_ATMOSPHERE : (SUBJECT_ATMOSPHERES[fach] ?? SCHREIBTISCH_ATMOSPHERE);
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
