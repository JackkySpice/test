import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../App.jsx';

describe('App', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            sessionId: 'session-123',
            repoPath: '/tmp/repo',
            approvalMode: 'suggest'
          })
      })
    );

    const listeners = {};
    class MockSocket {
      constructor() {
        this.readyState = MockSocket.OPEN;
        listeners.open = [];
        listeners.message = [];
        listeners.close = [];
        listeners.error = [];
      }

      static OPEN = 1;

      addEventListener(type, handler) {
        listeners[type].push(handler);
      }

      removeEventListener(type, handler) {
        listeners[type] = listeners[type].filter((fn) => fn !== handler);
      }

      send = jest.fn();

      close() {
        this.readyState = MockSocket.CLOSED;
      }
    }

    MockSocket.CLOSED = 3;

    global.WebSocket = MockSocket;

    global.__dispatchSocketEvent = (type, payload) => {
      for (const handler of listeners[type] || []) {
        handler(payload);
      }
    };
  });

  afterEach(() => {
    delete global.__dispatchSocketEvent;
    delete global.WebSocket;
  });

  it('creates a session and streams messages', async () => {
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start session/i }));
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/sessions', expect.any(Object));

    await act(async () => {
      global.__dispatchSocketEvent('open');
    });

    await act(async () => {
      global.__dispatchSocketEvent('message', {
        data: JSON.stringify({ type: 'stdout', data: 'Hello from Codex' })
      });
    });

    expect(await screen.findByText(/Hello from Codex/)).toBeInTheDocument();
  });
});
