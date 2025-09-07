import { useState, useRef, useEffect } from 'react';
import { useTranslation } from './useTranslations';

const PRESET_MESSAGES = [
  "Is ts Australia?",
  "Smoked.",
  "Shut Up",
  "Bro's as bad as Wyatt",
  "Why are we always in buttfuck nowhwere.",
  "This is your home country",
  "One more"
];

export default function PresetMessages({ onSendMessage, disabled = false }) {
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const customInputRef = useRef(null);
  const { t: text } = useTranslation("common");

  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  const handlePresetClick = (message) => {
    if (!disabled) {
      onSendMessage(message);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customMessage.trim() && !disabled) {
      onSendMessage(customMessage.trim());
      setCustomMessage('');
      setShowCustomInput(false);
    }
  };

  const handleScrollToBottom = () => {
    setShowCustomInput(true);
  };

  return (
    <div className="preset-messages-container">
      <div className="preset-messages">
        {PRESET_MESSAGES.map((message, index) => (
          <button
            key={index}
            className="preset-message"
            onClick={() => handlePresetClick(message)}
            disabled={disabled}
          >
            {message}
          </button>
        ))}
        <button
          className="preset-message"
          onClick={handleScrollToBottom}
          disabled={disabled}
          style={{
            background: 'var(--gradButton)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
        >
          Custom Message
        </button>
      </div>

      {showCustomInput && (
        <form onSubmit={handleCustomSubmit} className="custom-message-input">
          <input
            ref={customInputRef}
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Type your message..."
            maxLength={100}
            disabled={disabled}
          />
          <button
            type="submit"
            className="send-message-btn"
            disabled={disabled || !customMessage.trim()}
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomMessage('');
            }}
            className="preset-message"
            style={{ marginLeft: 'var(--space-sm)' }}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
