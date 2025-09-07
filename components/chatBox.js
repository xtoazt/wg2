import { Chatbot, createCustomMessage } from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import { createChatBotMessage } from 'react-chatbot-kit';
import React, { useEffect, useState } from 'react';
import { FaXmark } from 'react-icons/fa6';
import { useTranslation } from '@/components/useTranslations';
import { Filter } from 'bad-words';
import { toast } from 'react-toastify';
import PresetMessages from './PresetMessages';
const filter = new Filter();

const config = {
  initialMessages: [],
  customComponents: {
    header: () => <div className="react-chatbot-kit-chat-header">Chat</div>
  },
  customMessages: {
    custom: (props) => {
      return <CustomMessage {...props} message={props.state.messages.find(msg => (msg.payload === props.payload))} />;
    },
  },
};

const CustomMessage = ({ state, message }) => {
  return (
    <div className="react-chatbot-kit-chat-bot-message-container fgh">
      <div className="react-chatbot-kit-chat-bot-avatar">
        <div className="react-chatbot-kit-chat-bot-avatar-container">
          <p className="react-chatbot-kit-chat-bot-avatar-letter">{JSON.parse(message.message).username?.charAt(0)}</p>
        </div>
      </div>
      <div className="react-chatbot-kit-chat-bot-message">
        <span className='authorName'>{JSON.parse(message.message).username}</span>
        <br />
        <span>{JSON.parse(message.message).message}</span>
        <div className="react-chatbot-kit-chat-bot-message-arrow"></div>
      </div>
    </div>
  );
};

let lastSend = 0;

const ActionProvider = ({ createChatBotMessage, setState, children, ws, myId, inGame }) => {
  useEffect(() => {
    if (!ws) return;
    const ondata = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === 'chat' && data.id !== myId) {
        const senderUsername = data.name;
        setState((state) => {
          return { ...state, messages: [...state.messages, createCustomMessage(JSON.stringify({
            message: data.message,
            username: senderUsername
          }), 'custom', { payload: data.message })] };
        });
      }
    };

    ws.addEventListener('message', ondata);
    return () => {
      ws.removeEventListener('message', ondata);
    };
  }, [ws]);

  useEffect(() => {
    if (!inGame) setState((state) => {
      return { ...state, messages: [] };
    });
  }, [inGame]);

  function sendMsg(msg) {
    if (!ws) return;
    ws.send(JSON.stringify({ type: 'chat', message: msg }));
  }

  const handleMsg = (message) => {
    sendMsg(message);
  };

  const handlePresetMessage = (message) => {
    sendMsg(message);
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          actions: {
            handleMsg,
            handlePresetMessage,
          },
        });
      })}
    </div>
  );
};

const MessageParser = ({ children, actions }) => {
  const parse = (message) => {
    actions.handleMsg(message);
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          parse: parse,
          actions
        });
      })}
    </div>
  );
};

export default function ChatBox({ ws, open, onToggle, enabled, myId, inGame, miniMapShown, isGuest, publicGame, roundOverScreenShown }) {
  const { t: text } = useTranslation("common");
  const [unreadCount, setUnreadCount] = useState(0);

  const notGuestChatDisabled = !(!isGuest || (isGuest && !publicGame));

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
    }
  }, [open]);

  useEffect(() => {
    if (!ws) return;
    const ondata = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === 'chat' && data.id !== myId && !open) {
        setUnreadCount(prevCount => prevCount + 1);
      }
    };

    ws.addEventListener('message', ondata);
    return () => {
      ws.removeEventListener('message', ondata);
    };
  }, [ws, open]);

  // Hide chat button on mobile when RoundOverScreen is showing
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const shouldHideChatButton = false;
  return (
    <div className={`chatboxParent ${enabled ? 'enabled' : ''} ${notGuestChatDisabled ? 'guest' : ''} ${roundOverScreenShown ? 'roundOverScreen' : ''}`}>
      {!shouldHideChatButton && (
        <button
        className={`chatboxBtn ${open ? 'open' : ''} ${miniMapShown ? 'minimap' : ''}`} 
        style={{ 
          fontSize: '14px', 
          fontWeight: 'var(--font-weight-semibold)', 
          color: 'white', 
          background: 'var(--gradient-primary)', 
          border: '1px solid var(--accent)', 
          borderRadius: 'var(--radius-md)', 
          padding: 'var(--space-sm) var(--space-md)', 
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          boxShadow: 'var(--shadow-sm)'
        }} 
        onClick={onToggle}>
          {open ? <FaXmark onClick={onToggle} /> : `${text("chat")}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        </button>
      )}
      <div className={`chatbox ${open ? 'open' : ''}`}>
        {inGame && !notGuestChatDisabled && (
          <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
            <PresetMessages 
              onSendMessage={(message) => {
                if (ws) {
                  ws.send(JSON.stringify({ type: 'chat', message: message }));
                }
              }}
              disabled={notGuestChatDisabled}
            />
          </div>
        )}
        <Chatbot
          config={config}
          placeholderText={notGuestChatDisabled ? "Please login to chat" : undefined}
          messageParser={(props) => <MessageParser {...props} />}
          actionProvider={(props) => <ActionProvider {...props} ws={ws} myId={myId} inGame={inGame} />}
          validator={(input) => {
            if(notGuestChatDisabled) return false;
            if (input.length < 1) return false;
            if (input.length > 200) return false;
            if (Date.now() - lastSend < 1000) return false;
            if (filter.isProfane(input)) {
              toast.error('Be nice!');
              return false;
            }
            lastSend = Date.now();
            return true;
          }}
        />
      </div>
    </div>
  );
}
