jest.mock('node-pty');
const ptyMock = require('node-pty');
const { createSessionManager } = require('../src/session-manager');

const transcriptStore = {
  append: jest.fn().mockResolvedValue(undefined),
  getTranscript: jest.fn().mockResolvedValue([])
};

describe('session manager environment', () => {
  beforeEach(() => {
    ptyMock.__spawned.length = 0;
    transcriptStore.append.mockClear();
    transcriptStore.getTranscript.mockClear();
  });

  afterEach(() => {
    delete process.env.CODEX_ENV_OPENAI_API_KEY;
    delete process.env.CODEX_ADDITIONAL_ENV;
    delete process.env.CODEX_EXECUTABLE;
  });

  it('injects CODEX_ENV_ variables into the spawned process environment', () => {
    process.env.CODEX_ENV_OPENAI_API_KEY = 'sk-test';

    const manager = createSessionManager({ transcriptStore });
    manager.createSession();

    const spawned = ptyMock.__spawned[0];
    expect(spawned.options.env.OPENAI_API_KEY).toBe('sk-test');
    expect(spawned.options.env.CODEX_ENV_OPENAI_API_KEY).toBeUndefined();
  });

  it('merges CODEX_ADDITIONAL_ENV JSON payloads', () => {
    process.env.CODEX_ADDITIONAL_ENV = JSON.stringify({ CUSTOM_FLAG: '1' });

    const manager = createSessionManager({ transcriptStore });
    manager.createSession();

    const spawned = ptyMock.__spawned[0];
    expect(spawned.options.env.CUSTOM_FLAG).toBe('1');
  });

  it('prefers explicit executable over defaults', () => {
    process.env.CODEX_EXECUTABLE = '/custom/codex';

    const manager = createSessionManager({ transcriptStore });
    manager.createSession({ command: { executable: '/request/codex' } });

    const spawned = ptyMock.__spawned[0];
    expect(spawned.executable).toBe('/request/codex');
  });

  it('maps legacy approval modes to the new CLI flags', () => {
    const manager = createSessionManager({ transcriptStore });

    manager.createSession({ approvalMode: 'suggest' });
    let spawned = ptyMock.__spawned[0];
    expect(spawned.args).toContain('--ask-for-approval');
    expect(spawned.args).toContain('untrusted');

    manager.createSession({ approvalMode: 'auto-edit' });
    spawned = ptyMock.__spawned[1];
    expect(spawned.args).toContain('--ask-for-approval');
    expect(spawned.args).toContain('on-request');

    manager.createSession({ approvalMode: 'full-auto' });
    spawned = ptyMock.__spawned[2];
    expect(spawned.args).toContain('--full-auto');
    expect(spawned.args).not.toContain('--ask-for-approval');
  });
});
