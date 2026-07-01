type StartActionVariant = 'quelltext' | 'kompetenz' | 'schnell';

interface StartActionIllustrationProps {
  variant: StartActionVariant;
}

export function StartActionIllustration({ variant }: StartActionIllustrationProps) {
  return (
    <svg
      className={`start-action-illustration start-action-illustration--${variant}`}
      viewBox="0 0 240 150"
      fill="none"
      aria-hidden="true"
    >
      <path className="start-action-illustration__flow" d="M10 112 C52 84 86 126 122 94 S188 70 230 104" />
      <path className="start-action-illustration__flow start-action-illustration__flow--soft" d="M24 42 C70 18 110 38 146 28 S202 20 226 48" />
      {variant === 'quelltext' && <QuelltextIllustration />}
      {variant === 'kompetenz' && <KompetenzIllustration />}
      {variant === 'schnell' && <SchnellIllustration />}
    </svg>
  );
}

function QuelltextIllustration() {
  return (
    <>
      <path className="start-action-illustration__shape" d="M74 28 H150 L178 56 V122 H74 Z" />
      <path className="start-action-illustration__shape" d="M150 28 V56 H178" />
      <path className="start-action-illustration__line" d="M94 66 H150 M94 78 H158 M94 90 H138 M94 102 H152" />
      <path className="start-action-illustration__shape start-action-illustration__accent" d="M52 104 H112 C126 104 136 114 136 128 H76 C62 128 52 118 52 104 Z" />
      <path className="start-action-illustration__line" d="M66 116 H122" />
      <path className="start-action-illustration__accent-fill" d="M58 72 C58 58 70 48 84 50 C91 38 110 38 117 52 C132 52 142 62 142 76 C142 92 128 100 112 98 H76 C66 98 58 88 58 72 Z" />
      <path className="start-action-illustration__shape" d="M100 64 V88 M88 76 L100 64 L112 76" />
    </>
  );
}

function KompetenzIllustration() {
  return (
    <>
      <circle className="start-action-illustration__shape" cx="116" cy="74" r="46" />
      <circle className="start-action-illustration__line" cx="116" cy="74" r="30" />
      <path className="start-action-illustration__accent" d="M116 34 L126 66 L158 74 L126 82 L116 114 L106 82 L74 74 L106 66 Z" />
      <path className="start-action-illustration__line" d="M116 42 V106 M84 74 H148 M92 50 L140 98 M140 50 L92 98" />
      <path className="start-action-illustration__shape" d="M38 112 C58 96 78 96 100 112 V132 C78 118 58 118 38 130 Z" />
      <path className="start-action-illustration__shape" d="M202 112 C182 96 162 96 140 112 V132 C162 118 182 118 202 130 Z" />
      <circle className="start-action-illustration__dot" cx="54" cy="44" r="4" />
      <circle className="start-action-illustration__dot" cx="188" cy="48" r="4" />
      <circle className="start-action-illustration__dot" cx="206" cy="96" r="4" />
      <path className="start-action-illustration__line" d="M58 44 C82 28 100 36 116 48 M188 48 C164 32 142 36 126 52 M206 96 C176 110 152 104 134 92" />
    </>
  );
}

function SchnellIllustration() {
  return (
    <>
      <path className="start-action-illustration__shape" d="M82 34 H152 L172 54 V126 H82 Z" />
      <path className="start-action-illustration__shape" d="M152 34 V54 H172" />
      <path className="start-action-illustration__line" d="M100 72 H150 M100 84 H142 M100 96 H154" />
      <path className="start-action-illustration__accent-fill" d="M118 16 H158 L138 58 H168 L112 136 L128 82 H100 Z" />
      <circle className="start-action-illustration__shape" cx="70" cy="102" r="28" />
      <path className="start-action-illustration__line" d="M70 82 V102 L84 112 M58 70 H82" />
    </>
  );
}
