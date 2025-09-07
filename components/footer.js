import { useTranslation } from './useTranslations';

export default function Footer() {
  const { t: text } = useTranslation("common");

  return (
    <footer style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      fontSize: '12px',
      color: 'var(--textMuted)',
      fontFamily: 'var(--font-family)',
      zIndex: 1000,
      background: 'var(--background)',
      padding: '4px 8px',
      borderRadius: '4px',
      border: '1px solid var(--border)',
      opacity: 0.7
    }}>
      WG2 by Rohan
    </footer>
  );
}
