const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const compression = require('compression');
const serveStatic = require('serve-static');
const http = require('http');
const { WebSocketServer } = require('ws');
const { createSessionManager } = require('./session-manager');
const { buildTranscriptStore } = require('./storage');

function createServer(options = {}) {
  const transcriptStore = buildTranscriptStore(options);
  const sessionManager = createSessionManager({
    transcriptStore,
    command: options.command,
    defaultRepoPath: options.defaultRepoPath,
    historyLimit: options.historyLimit
  });

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(compression());

  app.get('/api/health', async (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/sessions', (_req, res) => {
    res.json({ sessions: sessionManager.listSessions() });
  });

  app.post('/api/sessions', (req, res) => {
    try {
      const session = sessionManager.createSession(req.body || {});
      res.status(201).json({
        sessionId: session.id,
        repoPath: session.repoPath,
        createdAt: session.createdAt,
        approvalMode: session.approvalMode,
        model: session.model,
        command: {
          executable: session.command.executable,
          args: session.command.args
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/sessions/:id', (req, res) => {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({
      id: session.id,
      repoPath: session.repoPath,
      createdAt: session.createdAt,
      approvalMode: session.approvalMode,
      model: session.model,
      command: session.command,
      closed: session.closed
    });
  });

  app.get('/api/sessions/:id/transcript', async (req, res) => {
    try {
      const transcript = await transcriptStore.getTranscript(req.params.id);
      res.json({ sessionId: req.params.id, events: transcript });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/sessions/:id', (req, res) => {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    sessionManager.closeSession(req.params.id);
    res.status(204).send();
  });

  const distPath = path.resolve(__dirname, '../web/dist');
  if (fs.existsSync(distPath)) {
    app.use('/', serveStatic(distPath));
    // Express 5 uses path-to-regexp@7 which no longer accepts "*" style
    // catch-all paths. Using a regular expression keeps the behaviour of
    // serving the client application for any non-API route while remaining
    // compatible with the new router implementation.
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket, request) => {
    const { searchParams } = new URL(request.url, 'http://localhost');
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      socket.close(1008, 'session-id-required');
      return;
    }
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      socket.close(1008, 'session-not-found');
      return;
    }

    const clientId = sessionManager.attachSocket(sessionId, socket);
    if (!clientId) {
      socket.close(1008, 'session-not-found');
      return;
    }

    socket.on('message', (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString());
      } catch (error) {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON payload' }));
        return;
      }

      if (payload.type === 'input') {
        try {
          sessionManager.sendInput(sessionId, {
            data: typeof payload.data === 'string' ? payload.data : '',
            author: payload.author || clientId
          });
        } catch (error) {
          socket.send(JSON.stringify({ type: 'error', message: error.message }));
        }
        return;
      }

      if (payload.type === 'signal') {
        sessionManager.sendSignal(sessionId, payload.signal || 'SIGINT');
        return;
      }

      socket.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    });
  });

  function start(port = process.env.PORT || 3000) {
    return new Promise((resolve) => {
      server.listen(port, () => {
        resolve(server.address());
      });
    });
  }

  async function stop() {
    sessionManager.shutdown();
    await new Promise((resolve, reject) => {
      wss.close((err) => (err ? reject(err) : resolve()));
    }).catch(() => {});
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  return {
    app,
    server,
    wss,
    start,
    stop,
    sessionManager,
    transcriptStore
  };
}

module.exports = { createServer };
