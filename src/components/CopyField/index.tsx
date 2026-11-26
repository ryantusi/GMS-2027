import { useState, useCallback } from 'react';
import { Copy, Check } from '@phosphor-icons/react';

export interface CopyFieldProps {
  value: string;
  label?: string;
  href?: string;
  theme?: 'light' | 'dark';
  className?: string;
}

/**
 * Shared CopyField component (DESIGN.md 1.6):
 * Renders a phone number or email (tabular-nums) with a copy button
 * that briefly confirms "Copied".
 */
export function CopyField({
  value,
  label,
  href,
  theme = 'dark',
  className = '',
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback copy via textarea if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }, [value]);

  if (!value) return null;

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-sea-salt' : 'text-deep-hull';
  const linkHover = isDark ? 'hover:text-sonar-cyan' : 'hover:text-[#00A9CE]';
  const mutedColor = isDark ? 'text-sea-salt/65' : 'text-deep-hull/65';
  const accentBorder = isDark
    ? 'border-sonar-cyan/25 hover:border-sonar-cyan/70 text-sea-salt/80 hover:text-sonar-cyan'
    : 'border-deep-hull/15 hover:border-[#00A9CE]/65 text-deep-hull/75 hover:text-[#00A9CE]';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && <span className={`text-xs ${mutedColor}`}>{label}</span>}
      {href ? (
        <a
          href={href}
          className={`tabular-nums text-[13.5px] font-medium ${textColor} ${linkHover} transition-colors duration-300 ease-out`}
        >
          {value}
        </a>
      ) : (
        <span className={`tabular-nums text-[13.5px] font-medium ${textColor}`}>
          {value}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${value}`}
        className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-1 text-xs transition-colors duration-300 ease-out min-h-[30px] cursor-pointer ${accentBorder}`}
      >
        {copied ? (
          <>
            <Check size={13} weight="bold" className="text-[#00A9CE]" />
            <span className="text-[#00A9CE]">Copied</span>
          </>
        ) : (
          <Copy size={13} weight="regular" />
        )}
      </button>
    </div>
  );
}

export default CopyField;
