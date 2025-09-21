const request = require('supertest');
const WebSocket = require('ws');
const { createServer } = require('../src/server');

jest.mock('node-pty');
const ptyMock = require('node-pty');

describe('server', () => {
  let server;
  let address;
  const transcriptStore = {
    append: jest.fn().mockResolvedValue(undefined),
    getTranscript: jest.fn().mockResolvedValue([])
  };

  beforeEach(async () => {
    transcriptStore.append.mockClear();
    transcriptStore.getTranscript.mockClear();
    ptyMock.__spawned.length = 0;
    server = createServer({ transcriptStore });
    address = await server.start(0);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('creates a session and lists it', async () => {
    const res = await request(server.app).post('/api/sessions').send({ repoPath: process.cwd() }).expect(201);
    expect(res.body.sessionId).toBeDefined();

    const list = await request(server.app).get('/api/sessions').expect(200);
    expect(list.body.sessions).toHaveLength(1);
    expect(list.body.sessions[0].id).toBe(res.body.sessionId);
    expect(transcriptStore.append).toHaveBeenCalled();
  });

  it('streams data over websocket and accepts input', async () => {
    const res = await request(server.app).post('/api/sessions').send({ repoPath: process.cwd() }).expect(201);
    const sessionId = res.body.sessionId;

    const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws?sessionId=${sessionId}`);
    const messages = [];
    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    await new Promise((resolve) => ws.once('open', resolve));

    const spawned = ptyMock.__spawned[0];

    const stdinPromise = new Promise((resolve) => {
      ws.on('message', (data) => {
        const payload = JSON.parse(data.toString());
        if (payload.type === 'stdin') {
          resolve(payload);
        }
      });
    });

    const stdoutPromise = new Promise((resolve) => {
      ws.on('message', (data) => {
        const payload = JSON.parse(data.toString());
        if (payload.type === 'stdout') {
          resolve(payload);
        }
      });
    });

    const writePromise = new Promise((resolve) => spawned.once('write', resolve));
    ws.send(JSON.stringify({ type: 'input', data: 'help\n' }));
    await writePromise;
    expect(spawned.written).toContain('help\n');

    spawned.emitData('Codex ready');
    spawned.emitData('> result');

    await Promise.all([stdinPromise, stdoutPromise]);

    spawned.kill('SIGTERM');
    await new Promise((resolve) => ws.once('close', resolve));

    const stdoutMessages = messages.filter((msg) => msg.type === 'stdout');
    expect(stdoutMessages.length).toBeGreaterThanOrEqual(1);

    const recordedTypes = transcriptStore.append.mock.calls
      .filter((call) => call[0] === sessionId)
      .map((call) => call[1].type);
    expect(recordedTypes).toContain('stdout');
    expect(recordedTypes).toContain('stdin');
  });
});
