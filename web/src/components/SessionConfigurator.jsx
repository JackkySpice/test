import { useState } from 'react';
import PropTypes from 'prop-types';

const approvalModes = [
  { value: 'suggest', label: 'Suggest (ask before changes)' },
  { value: 'auto-edit', label: 'Auto-edit (apply edits, confirm commands)' },
  { value: 'full-auto', label: 'Full auto (no prompts)' }
];

export function SessionConfigurator({ onConnect, status = 'idle', session = null }) {
  const [repoPath, setRepoPath] = useState('');
  const [model, setModel] = useState('');
  const [approvalMode, setApprovalMode] = useState('suggest');

  const handleSubmit = (event) => {
    event.preventDefault();
    onConnect({ repoPath, model, approvalMode });
  };

  return (
    <div className="sidebar">
      <h2>Session</h2>
      <form className="session-form" onSubmit={handleSubmit}>
        <label>
          Repository path
          <input
            type="text"
            value={repoPath}
            onChange={(event) => setRepoPath(event.target.value)}
            placeholder="/workspace/project"
          />
        </label>
        <label>
          Model override
          <input
            type="text"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="gpt-5-codex"
          />
        </label>
        <label>
          Approval mode
          <select value={approvalMode} onChange={(event) => setApprovalMode(event.target.value)}>
            {approvalModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary" disabled={status === 'connecting'}>
          {status === 'connected' ? 'Restart session' : 'Start session'}
        </button>
      </form>
      {session && (
        <div className="session-meta">
          <h3>Active session</h3>
          <dl>
            <dt>ID</dt>
            <dd>{session.sessionId}</dd>
            <dt>Repo</dt>
            <dd>{session.repoPath}</dd>
            <dt>Model</dt>
            <dd>{session.model || 'default'}</dd>
            <dt>Mode</dt>
            <dd>{session.approvalMode || 'suggest'}</dd>
          </dl>
        </div>
      )}
      <div className="note">
        <p>
          Transcripts are persisted to your configured Supabase instance. Configure <code>SUPABASE_URL</code> and{' '}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> before deploying.
        </p>
      </div>
    </div>
  );
}

SessionConfigurator.propTypes = {
  onConnect: PropTypes.func.isRequired,
  status: PropTypes.string,
  session: PropTypes.shape({
    sessionId: PropTypes.string,
    repoPath: PropTypes.string,
    approvalMode: PropTypes.string,
    model: PropTypes.string
  })
};

export default SessionConfigurator;
