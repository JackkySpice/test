import { useCallback, useMemo, useState } from 'react';
import ChatWindow from './components/ChatWindow.jsx';
import SessionConfigurator from './components/SessionConfigurator.jsx';
import useCodexSession from './hooks/useCodexSession.js';
import './styles/layout.css';

function ensureId(index) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `message-${Date.now()}-${index}`;
}

function formatTimestamp(value) {
  try {
    return new Date(value).toLocaleTimeString();
  } catch (error) {
    return '';
  }
}

function mapEventToMessage(event, index) {
  const base = {
    id: event.id || ensureId(index),
    time: formatTimestamp(event.at)
  };
  if (event.type === 'stdin') {
    return {
      ...base,
      role: 'user',
      content: event.data
    };
  }
  if (event.type === 'stdout') {
    return {
      ...base,
      role: 'assistant',
      content: event.data
    };
  }
  if (event.type === 'stderr') {
    return {
      ...base,
      role: 'system',
      content: event.data
    };
  }
  if (event.type === 'exit') {
    return {
      ...base,
      role: 'system',
      content: `Session exited with code ${event.code ?? 'unknown'}${event.signal ? ` (signal ${event.signal})` : ''}`
    };
  }
  if (event.type === 'error') {
    return {
      ...base,
      role: 'system',
      content: event.message || 'An error occurred'
    };
  }
  if (event.type === 'session-created') {
    return {
      ...base,
      role: 'system',
      content: `Session created for ${event.repoPath}`
    };
  }
  return {
    ...base,
    role: 'system',
    content: JSON.stringify(event)
  };
}

export function App() {
  const [clientError, setClientError] = useState(null);
  const { session, events, status, error, connect, sendInput, sendSignal } = useCodexSession();

  const messages = useMemo(() => events.map((event, index) => mapEventToMessage(event, index)), [events]);

  const handleConnect = useCallback(
    (options) => {
      setClientError(null);
      connect(options);
    },
    [connect]
  );

  const handleSend = useCallback(
    (text) => {
      try {
        sendInput(text);
        setClientError(null);
      } catch (err) {
        setClientError(err);
      }
    },
    [sendInput]
  );

  return (
    <div className="app-shell">
      <header>
        <div className="brand">
          <span className="logo" aria-hidden="true">
            ✨
          </span>
          <div>
            <h1>Codex Cloud Chat</h1>
            <p className="subtitle">Pair program with Codex CLI through a beautiful browser UI</p>
          </div>
        </div>
        <nav>
          <a href="https://platform.openai.com/docs/guides/codex" target="_blank" rel="noreferrer">
            Codex Docs
          </a>
          <a href="https://supabase.com" target="_blank" rel="noreferrer">
            Supabase
          </a>
        </nav>
      </header>
      <main className="content">
        <SessionConfigurator onConnect={handleConnect} status={status} session={session} />
        <div className="workspace">
          {error && <div className="error-banner">{error.message}</div>}
          {clientError && <div className="error-banner">{clientError.message}</div>}
          <ChatWindow
            messages={messages}
            onSend={handleSend}
            onInterrupt={() => sendSignal('SIGINT')}
            disabled={status !== 'connected'}
            status={status}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
