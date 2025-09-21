const { randomUUID } = require('crypto');
const path = require('node:path');
const fs = require('node:fs');
const pty = require('node-pty');

const HISTORY_LIMIT = 2000;

function sanitizeApprovalMode(mode) {
  if (!mode) return undefined;
  const normalized = String(mode).toLowerCase();
  const map = new Map([
    ['suggest', 'suggest'],
    ['read-only', 'suggest'],
    ['read_only', 'suggest'],
    ['auto-edit', 'auto-edit'],
    ['auto', 'auto-edit'],
    ['full-auto', 'full-auto'],
    ['full', 'full-auto']
  ]);
  return map.get(normalized);
}

function sanitizeModel(model) {
  if (!model) return undefined;
  const trimmed = String(model).trim();
  return trimmed.length ? trimmed : undefined;
}

function sanitizeRepoPath(repoPath, defaultRepoPath) {
  if (repoPath && typeof repoPath === 'string' && repoPath.trim()) {
    const resolved = path.resolve(repoPath.trim());
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
  }
  if (defaultRepoPath && fs.existsSync(defaultRepoPath) && fs.statSync(defaultRepoPath).isDirectory()) {
    return path.resolve(defaultRepoPath);
  }
  return process.cwd();
}

function resolveExecutable(explicitExecutable) {
  if (explicitExecutable && explicitExecutable.trim()) {
    return explicitExecutable.trim();
  }

  if (process.env.CODEX_EXECUTABLE && process.env.CODEX_EXECUTABLE.trim()) {
    return process.env.CODEX_EXECUTABLE.trim();
  }

  const localCodex = path.resolve(process.cwd(), 'node_modules/.bin/codex');
  if (fs.existsSync(localCodex)) {
    return localCodex;
  }

  return 'codex';
}

function pickPrefixedEnv(prefix = 'CODEX_ENV_') {
  const entries = Object.entries(process.env).filter(([key]) => key.startsWith(prefix));
  const mapped = {};
  for (const [key, value] of entries) {
    const envKey = key.slice(prefix.length);
    if (envKey) {
      mapped[envKey] = value;
    }
  }
  return mapped;
}

function buildCommand({ executable, args, approvalMode, model, additionalEnv }) {
  const command = {
    executable: resolveExecutable(executable),
    args: Array.isArray(args) ? [...args] : []
  };

  const normalizedMode = sanitizeApprovalMode(approvalMode);
  if (normalizedMode) {
    command.args.push('--approval-mode', normalizedMode);
  }

  const normalizedModel = sanitizeModel(model);
  if (normalizedModel) {
    command.args.push('--model', normalizedModel);
  }

  let envFromProcess = {};
  if (process.env.CODEX_ADDITIONAL_ENV) {
    try {
      envFromProcess = JSON.parse(process.env.CODEX_ADDITIONAL_ENV);
    } catch (error) {
      console.warn('Invalid CODEX_ADDITIONAL_ENV JSON payload', error); // eslint-disable-line no-console
    }
  }
  const baseEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('CODEX_ENV_'))
  );
  command.env = {
    ...baseEnv,
    ...pickPrefixedEnv(),
    ...envFromProcess,
    ...(additionalEnv || {})
  };

  return command;
}

function createSessionManager(options = {}) {
  const {
    transcriptStore,
    historyLimit = HISTORY_LIMIT,
    command = {},
    defaultRepoPath
  } = options;

  const sessions = new Map();

  function createSession(request = {}) {
    const sessionId = randomUUID();
    const repoPath = sanitizeRepoPath(request.repoPath, defaultRepoPath || command.repoPath);
    const commandConfig = buildCommand({
      executable: request.command?.executable || command.executable,
      args: request.command?.args || command.args,
      approvalMode: request.approvalMode || command.approvalMode,
      model: request.model || command.model,
      additionalEnv: {
        ...(command.env || {}),
        ...(request.command?.env || {})
      }
    });

    const ptyProcess = pty.spawn(commandConfig.executable, commandConfig.args, {
      cols: 160,
      rows: 40,
      cwd: repoPath,
      name: 'xterm-color',
      env: commandConfig.env
    });

    const session = {
      id: sessionId,
      repoPath,
      command: commandConfig,
      approvalMode: request.approvalMode || command.approvalMode,
      model: request.model || command.model,
      createdAt: new Date().toISOString(),
      sockets: new Map(),
      pty: ptyProcess,
      history: [],
      closed: false
    };

    function pushEvent(event) {
      const enriched = {
        ...event,
        at: event.at || new Date().toISOString()
      };
      session.history.push(enriched);
      if (session.history.length > historyLimit) {
        session.history.shift();
      }
      if (transcriptStore && typeof transcriptStore.append === 'function') {
        transcriptStore.append(session.id, enriched).catch((err) => {
          console.error('Failed to persist transcript event', err);
        });
      }
      return enriched;
    }

    function broadcast(event) {
      const enriched = pushEvent(event);
      const payload = JSON.stringify(enriched);
      for (const socket of session.sockets.values()) {
        if (socket.readyState === socket.OPEN) {
          socket.send(payload);
        }
      }
    }

    ptyProcess.onData((chunk) => {
      broadcast({ type: 'stdout', data: chunk });
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      session.closed = true;
      broadcast({ type: 'exit', code: exitCode, signal: signal || null });
      for (const socket of session.sockets.values()) {
        if (socket.readyState === socket.OPEN) {
          socket.close(1000, 'session-ended');
        }
      }
      session.sockets.clear();
    });

    sessions.set(sessionId, session);
    pushEvent({
      type: 'session-created',
      sessionId: session.id,
      repoPath: session.repoPath,
      approvalMode: session.approvalMode,
      model: session.model
    });

    if (request.initialMessage && typeof request.initialMessage === 'string') {
      setTimeout(() => {
        ptyProcess.write(`${request.initialMessage}\r`);
        broadcast({ type: 'stdin', data: request.initialMessage, author: 'bootstrap' });
      }, 20);
    }

    return session;
  }

  function getSession(sessionId) {
    return sessions.get(sessionId);
  }

  function listSessions() {
    return Array.from(sessions.values()).map((session) => ({
      id: session.id,
      repoPath: session.repoPath,
      createdAt: session.createdAt,
      approvalMode: session.approvalMode,
      model: session.model,
      closed: session.closed
    }));
  }

  function attachSocket(sessionId, socket) {
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const clientId = randomUUID();
    session.sockets.set(clientId, socket);

    socket.send(
      JSON.stringify({
        type: 'welcome',
        sessionId,
        clientId
      })
    );

    socket.send(
      JSON.stringify({
        type: 'session-state',
        sessionId,
        repoPath: session.repoPath,
        createdAt: session.createdAt,
        approvalMode: session.approvalMode,
        model: session.model,
        closed: session.closed
      })
    );

    for (const event of session.history) {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(event));
      }
    }

    socket.on('close', () => {
      session.sockets.delete(clientId);
    });

    return clientId;
  }

  function sendInput(sessionId, payload) {
    const session = sessions.get(sessionId);
    if (!session || session.closed) {
      throw new Error('Session closed');
    }
    const data = typeof payload?.data === 'string' ? payload.data : '';
    if (!data) {
      throw new Error('Input payload must include data string');
    }
    session.pty.write(data);
    if (!payload.silent) {
      const enriched = {
        type: 'stdin',
        data,
        author: payload.author || 'user',
        at: new Date().toISOString()
      };
      session.history.push(enriched);
      if (session.history.length > historyLimit) {
        session.history.shift();
      }
      if (transcriptStore && typeof transcriptStore.append === 'function') {
        transcriptStore.append(session.id, enriched).catch((err) => {
          console.error('Failed to persist stdin event', err);
        });
      }
      const message = JSON.stringify(enriched);
      for (const socket of session.sockets.values()) {
        if (socket.readyState === socket.OPEN) {
          socket.send(message);
        }
      }
    }
  }

  function sendSignal(sessionId, signal = 'SIGINT') {
    const session = sessions.get(sessionId);
    if (!session || session.closed) {
      return;
    }
    session.pty.kill(signal);
  }

  function closeSession(sessionId, reason = 'SIGTERM') {
    const session = sessions.get(sessionId);
    if (!session) {
      return;
    }
    if (!session.closed) {
      session.pty.kill(reason);
    }
    sessions.delete(sessionId);
  }

  function shutdown() {
    for (const sessionId of sessions.keys()) {
      closeSession(sessionId);
    }
  }

  return {
    createSession,
    getSession,
    listSessions,
    attachSocket,
    sendInput,
    sendSignal,
    closeSession,
    shutdown,
    sessions
  };
}

module.exports = { createSessionManager };
