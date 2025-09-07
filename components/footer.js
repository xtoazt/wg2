import { useTranslation } from './useTranslations';

export default function Footer() {
  const { t: text } = useTranslation("common");

  return (
    <footer style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      fontSize: '13px',
      color: 'var(--textMuted)',
      fontFamily: 'var(--font-family)',
      zIndex: 1000,
      background: 'var(--glassEffect)',
      backdropFilter: 'blur(12px)',
      padding: '8px 16px',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      opacity: 0.8,
      fontWeight: '500',
      letterSpacing: '-0.01em',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    }}>
      WG2 by Rohan
    </footer>
  );
}
