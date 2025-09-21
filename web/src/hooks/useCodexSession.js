import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useCodexSession() {
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const clientIdRef = useRef(null);

  const reset = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setSession(null);
    setEvents([]);
    setStatus('idle');
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('closed');
  }, []);

  const connect = useCallback(
    async (options = {}) => {
      setStatus('connecting');
      setError(null);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setEvents([]);
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options)
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to create session');
        }
        const data = await response.json();
        setSession(data);
        const wsUrl = new URL('/ws', window.location.origin);
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl.searchParams.set('sessionId', data.sessionId);
        const socket = new WebSocket(wsUrl.toString());
        socketRef.current = socket;

        socket.addEventListener('open', () => {
          setStatus('connected');
        });

        socket.addEventListener('message', (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'welcome') {
              clientIdRef.current = payload.clientId;
              return;
            }
            setEvents((previous) => [...previous, payload]);
          } catch (err) {
            console.error('Failed to parse websocket payload', err); // eslint-disable-line no-console
          }
        });

        socket.addEventListener('close', () => {
          setStatus('closed');
        });

        socket.addEventListener('error', (evt) => {
          console.error('WebSocket error', evt); // eslint-disable-line no-console
          setError(new Error('WebSocket error'));
          setStatus('error');
        });
      } catch (err) {
        setStatus('error');
        setError(err);
      }
    },
    []
  );

  const sendInput = useCallback((text) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('Session is not connected');
    }
    socketRef.current.send(
      JSON.stringify({
        type: 'input',
        data: text,
        author: clientIdRef.current
      })
    );
  }, []);

  const sendSignal = useCallback((signal = 'SIGINT') => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    socketRef.current.send(
      JSON.stringify({
        type: 'signal',
        signal
      })
    );
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  const value = useMemo(
    () => ({
      session,
      events,
      status,
      error,
      connect,
      disconnect,
      reset,
      sendInput,
      sendSignal
    }),
    [connect, disconnect, error, events, reset, sendInput, sendSignal, session, status]
  );

  return value;
}

export default useCodexSession;
