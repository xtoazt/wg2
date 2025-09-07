import { useState } from 'react';
import { useTranslation } from './useTranslations';

export default function Footer() {
  const { t: text } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 1000,
      fontFamily: '"Kode Mono", monospace'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'black',
          border: '1px solid white',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: '"Kode Mono", monospace'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'white';
          e.target.style.color = 'black';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'black';
          e.target.style.color = 'white';
        }}
      >
        WG2
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          marginBottom: '8px',
          background: 'black',
          border: '1px solid white',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '11px',
          color: 'white',
          whiteSpace: 'nowrap',
          fontFamily: '"Kode Mono", monospace',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
        }}>
          Made by Rohan
        </div>
      )}
    </div>
  );
}
