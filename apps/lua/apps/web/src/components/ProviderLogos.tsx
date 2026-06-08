import claudeLogo from '../assets/provider-logos/claude.svg';
import chatgptLogo from '../assets/provider-logos/chatgpt.svg';
import deepseekLogo from '../assets/provider-logos/deepseek.png';
import kimiLogo from '../assets/provider-logos/kimi.png';
import mistralLogo from '../assets/provider-logos/mistral.png';
import qwenLogo from '../assets/provider-logos/qwen.png';

interface ProviderLogoProps {
  providerId: string;
  label: string;
  size?: number;
}

const PROVIDER_LOGO_SRC: Record<string, string> = {
  claude: claudeLogo,
  chatgpt: chatgptLogo,
  deepseek: deepseekLogo,
  mistral: mistralLogo,
  qwen: qwenLogo,
  kimi: kimiLogo,
};

export function ProviderLogo({ providerId, label, size = 28 }: ProviderLogoProps) {
  const src = PROVIDER_LOGO_SRC[providerId];

  if (!src) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg-base)',
          color: 'var(--color-text-secondary)',
          fontWeight: 700,
          fontSize: Math.max(11, size * 0.45),
          flex: '0 0 auto',
        }}
      >
        {label.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`${label} Logo`}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flex: '0 0 auto',
        display: 'block',
      }}
    />
  );
}
