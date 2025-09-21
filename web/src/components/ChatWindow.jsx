import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import AnsiToHtml from 'ansi-to-html';

const converter = new AnsiToHtml({ newline: true, escapeXML: true });

function roleLabel(role) {
  switch (role) {
    case 'user':
      return 'You';
    case 'assistant':
      return 'Codex';
    case 'system':
      return 'System';
    default:
      return role;
  }
}

export function ChatWindow({ messages, onSend, onInterrupt, disabled = false, status = 'idle' }) {
  const [draft, setDraft] = useState('');
  const scroller = useRef(null);

  useEffect(() => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    const payload = draft.endsWith('\n') ? draft : `${draft}\n`;
    onSend(payload);
    setDraft('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div>
          <h2>Conversation</h2>
          <p className="status">Session status: {status}</p>
        </div>
        <button type="button" className="ghost" onClick={onInterrupt} disabled={disabled}>
          Send Ctrl+C
        </button>
      </div>
      <div className="chat-history" ref={scroller}>
        {messages.length === 0 && <p className="empty">No messages yet. Start the conversation below.</p>}
        {messages.map((message) => {
          const html = message.html ?? converter.toHtml(message.content || '');
          return (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="meta">
                <span className="role">{roleLabel(message.role)}</span>
                <span className="time">{message.time}</span>
              </div>
              <div className="body" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          );
        })}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Describe what you want Codex to do..."
          disabled={disabled}
          rows={3}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (!disabled) {
                handleSubmit(event);
              }
            }
          }}
        />
        <div className="chat-actions">
          <button type="submit" disabled={disabled || !draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

ChatWindow.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      role: PropTypes.string.isRequired,
      content: PropTypes.string,
      html: PropTypes.string,
      time: PropTypes.string
    })
  ).isRequired,
  onSend: PropTypes.func.isRequired,
  onInterrupt: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  status: PropTypes.string
};

export default ChatWindow;
