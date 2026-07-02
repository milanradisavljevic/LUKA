type StartActionVariant = 'quelltext' | 'kompetenz' | 'schnell';

interface StartActionIllustrationProps {
  variant: StartActionVariant;
}

export function StartActionIllustration({ variant }: StartActionIllustrationProps) {
  return (
    <svg
      className={`start-action-illustration start-action-illustration--${variant}`}
      viewBox="0 0 280 170"
      fill="none"
      aria-hidden="true"
    >
      <path className="start-action-illustration__flow" d="M18 124 C62 92 98 136 140 102 S214 76 262 116" />
      <path className="start-action-illustration__flow start-action-illustration__flow--soft" d="M32 46 C82 20 128 44 168 30 S226 24 256 52" />
      {variant === 'quelltext' && <QuelltextIllustration />}
      {variant === 'kompetenz' && <KompetenzIllustration />}
      {variant === 'schnell' && <SchnellIllustration />}
    </svg>
  );
}

function QuelltextIllustration() {
  return (
    <>
      <path className="start-action-illustration__shape" d="M62 24 H154 L186 56 V138 H62 Z" />
      <path className="start-action-illustration__shape" d="M154 24 V56 H186" />
      <path className="start-action-illustration__shade" d="M71 34 C95 28 126 30 150 36 M72 128 C102 136 138 134 176 124" />
      <path className="start-action-illustration__line" d="M86 63 H150 M86 76 H164 M86 89 H146 M86 102 H158 M86 115 H136" />
      <path className="start-action-illustration__fine" d="M76 54 C80 52 84 52 88 54 M76 67 C79 65 83 65 86 67 M76 80 C79 78 83 78 86 80" />
      <path className="start-action-illustration__accent" d="M44 122 C66 110 90 110 112 122 C134 134 158 134 180 122" />
      <path className="start-action-illustration__accent" d="M204 37 H240 V72 H204 Z M204 82 H240 V117 H204 Z M204 127 H240 V153 H204 Z" />
      <path className="start-action-illustration__line" d="M215 54 L223 62 L236 47 M214 98 H232 M214 143 L221 150 L235 134" />
      <path className="start-action-illustration__flow" d="M174 74 C198 70 188 48 204 48 M176 98 C198 98 188 100 204 100 M174 121 C194 126 188 142 204 142" />
      <path className="start-action-illustration__accent-fill" d="M42 70 C42 57 54 48 68 51 C75 38 96 38 104 53 C120 53 132 64 132 79 C132 96 116 105 99 102 H61 C50 102 42 91 42 70 Z" />
      <path className="start-action-illustration__shape" d="M86 64 V91 M74 77 L86 64 L98 77" />
      <path className="start-action-illustration__fine" d="M52 84 C62 88 74 88 86 84 M92 84 C102 88 112 88 122 84" />
    </>
  );
}

function KompetenzIllustration() {
  return (
    <>
      <path className="start-action-illustration__shape" d="M54 114 C78 100 103 101 132 118 V145 C104 130 78 130 54 144 Z" />
      <path className="start-action-illustration__shape" d="M226 114 C202 100 177 101 148 118 V145 C176 130 202 130 226 144 Z" />
      <path className="start-action-illustration__line" d="M132 118 C136 124 144 124 148 118 M72 124 C91 116 108 118 126 128 M154 128 C173 118 194 116 214 124" />
      <path className="start-action-illustration__accent" d="M83 32 H123 V72 H83 Z M133 32 H173 V72 H133 Z M83 82 H123 V122 H83 Z M133 82 H173 V122 H133 Z" />
      <path className="start-action-illustration__hatch" d="M138 67 L168 37 M147 72 L173 46 M133 58 L158 32" />
      <path className="start-action-illustration__line" d="M62 65 C82 48 94 47 110 54 M186 50 C210 53 226 68 236 91" strokeDasharray="4 7" />
      <path className="start-action-illustration__accent" d="M204 31 L211 54 L235 61 L211 68 L204 92 L197 68 L173 61 L197 54 Z" />
      <path className="start-action-illustration__fine" d="M204 14 V24 M204 99 V110 M155 61 H166 M242 61 H253 M169 26 L177 34 M231 88 L239 96 M239 26 L231 34 M177 88 L169 96" />
      <circle className="start-action-illustration__dot" cx="62" cy="65" r="3.5" />
      <circle className="start-action-illustration__dot" cx="236" cy="91" r="3.5" />
    </>
  );
}

function SchnellIllustration() {
  return (
    <>
      <path className="start-action-illustration__flow" d="M32 54 H72 M26 82 H62 M42 112 H78" />
      <path className="start-action-illustration__shape" d="M82 25 H166 L194 53 V143 H82 Z" />
      <path className="start-action-illustration__shape" d="M166 25 V53 H194" />
      <path className="start-action-illustration__line" d="M103 68 H163 M103 84 H152 M103 100 H170 M103 116 H145" />
      <path className="start-action-illustration__fine" d="M96 67 H88 V75 H96 Z M96 99 H88 V107 H96 Z" />
      <path className="start-action-illustration__line" d="M89 86 L94 91 L101 80" />
      <circle className="start-action-illustration__shape" cx="218" cy="112" r="28" />
      <path className="start-action-illustration__line" d="M218 91 V112 L232 121 M207 77 H229 M218 77 V84" />
      <path className="start-action-illustration__accent" d="M221 22 L226 38 L243 43 L226 48 L221 65 L216 48 L199 43 L216 38 Z" />
      <path className="start-action-illustration__fine" d="M249 33 L259 27 M252 51 L263 57 M190 31 L181 24 M191 55 L181 63" />
      <path className="start-action-illustration__accent-fill" d="M54 128 C72 120 92 120 110 128 C126 136 144 136 162 128" />
    </>
  );
}
