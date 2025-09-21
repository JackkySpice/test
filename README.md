# Codex Cloud Chat Wrapper

A full-stack web experience that wraps the **OpenAI Codex CLI** with a beautiful, streaming chat UI. Sessions run the actual Codex CLI inside a pseudo-terminal, and every token streamed back from Codex is broadcast to the browser in real time. Transcripts are persisted to Supabase so you can review conversations and approvals from anywhere, and the project ships with a one-click Render deployment.

## Features

- 🌐 **Beautiful browser chat** – responsive React UI with chat bubbles, status, and keyboard shortcuts.
- 🧠 **Real Codex CLI integration** – spawns the real `codex` binary inside a PTY; no shims required.
- ☁️ **Cloud transcript storage** – every stdin/stdout/stderr/exit event is saved to Supabase.
- 🔄 **Live approvals and commands** – send text instructions, trigger Ctrl+C, and monitor Codex loops.
- 🚀 **Render-ready** – `render.yaml` + deploy button for fast hosting on Render’s free tier.
- ✅ **Comprehensive tests** – Jest coverage for the API/WebSocket layer and UI session flow.

## Architecture

```
+-------------------+        WebSocket/REST        +--------------------------+
|   React Frontend   |  <---------------------->   |  Express + WebSocket API |
|  (Vite build)      |                             |  node-pty Codex sessions  |
+---------+---------+                             +-----------+--------------+
          |                                                     |
          |  Supabase REST API (https)                          |
          v                                                     v
+----------------------------+                   +---------------------------+
| Supabase Postgres (JSONB)  |                   |  Codex CLI running in PTY |
| codex_transcripts table    |                   |  spawned per chat session |
+----------------------------+                   +---------------------------+
```

## 🚀 Plug-and-Play Quickstart

You only need a machine (or cloud runtime) that can reach the OpenAI APIs. The Codex CLI binary ships with this repo, so the
deployment is ready to go once you provide credentials.

```bash
git clone <your fork>
cd codex-cloud-chat
npm install
# provide your OpenAI credential once (see below) and then
CODEX_ENV_OPENAI_API_KEY=sk-... npm run start
```

The UI opens at http://localhost:3000 and immediately connects to a live Codex session. No extra services are required. If you
deploy to Render with the included button, just add the same `CODEX_ENV_OPENAI_API_KEY` secret in the dashboard and you’re done.

## Requirements

- Node.js 18+
- Yarn or npm (repo uses npm scripts)
- An OpenAI credential (ChatGPT session token or API key)

> **Codex CLI binary included:** The `@openai/codex` package is installed alongside the app, so you don’t need to install the CLI
> globally. We resolve `node_modules/.bin/codex` automatically when starting sessions.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CODEX_ENV_OPENAI_API_KEY` | ✅ | Injects `OPENAI_API_KEY` into the Codex CLI process for API-key-based auth. |
| `CODEX_ADDITIONAL_ENV` | optional | JSON blob merged into the Codex CLI environment. Useful for advanced auth methods. |
| `CODEX_EXECUTABLE` | optional | Override the Codex binary path. Defaults to the bundled `node_modules/.bin/codex` or whatever is on `PATH`. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | optional | Enable persistent transcript storage (see below). |

Any variable starting with `CODEX_ENV_` is mapped to the Codex process environment without the prefix. For example,
`CODEX_ENV_OPENAI_API_KEY` becomes `OPENAI_API_KEY`, and `CODEX_ENV_CODEX_SESSION_TOKEN` would become `CODEX_SESSION_TOKEN`.

### Optional: Supabase transcript storage

Out of the box transcripts are stored in-memory. If you want them to survive restarts, point the server at a Supabase project.

1. Create a new Supabase project.
2. In SQL editor, run:

   ```sql
   create extension if not exists "uuid-ossp";

   create table if not exists codex_transcripts (
     id uuid primary key default gen_random_uuid(),
     session_id uuid not null,
     event_type text not null,
     payload jsonb not null,
     created_at timestamptz not null default now()
   );

   alter table codex_transcripts enable row level security;

   create policy "Allow service role insert" on codex_transcripts
     for insert with check (true);

   create policy "Allow service role select" on codex_transcripts
     for select using (true);
   ```

3. Grab the **Project URL** and **Service Role Key** from Settings → API. Set them as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Configuration

Create an `.env` (or configure environment variables in Render) with:

```
CODEX_ENV_OPENAI_API_KEY=sk-...                       # required for API-key auth
SUPABASE_URL=your-supabase-url                        # optional, enables persistence
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key       # optional, enables persistence
SUPABASE_TRANSCRIPTS_TABLE=codex_transcripts          # optional override
CODEX_EXECUTABLE=/custom/path/to/codex                # optional, auto-detected otherwise
CODEX_ADDITIONAL_ENV={"CODEX_SESSION_TOKEN":"..."}   # optional JSON for advanced auth
PORT=3000
```

## Local development

```bash
npm install
npm run build       # builds the React frontend
npm run start       # serves the production bundle + API on http://localhost:3000
```

During development you can run the backend and frontend separately:

```bash
npm run dev         # starts Express with live API
npm run dev:web     # in another terminal, run Vite dev server (auto-proxy to :3000)
```

> **Tip:** If you want to experiment without Codex locally, point `CODEX_EXECUTABLE` at a shell script that echoes messages (for example `./scripts/dev-cli.js`). The production build always expects the genuine `codex` binary.

## Testing

```bash
npm test
```

The suite covers:

- API + WebSocket lifecycle with mocked PTY sessions
- React UI session creation and streaming rendering

## Deployment

### 1-click Render deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_GITHUB_USERNAME/codex-cloud-chat)

1. Push this repository to GitHub and replace `YOUR_GITHUB_USERNAME/codex-cloud-chat` in the button URL with your repo slug.
2. Click the button to import the project in Render. It uses the bundled `render.yaml` for configuration.
3. Add a single secret: `CODEX_ENV_OPENAI_API_KEY` with your OpenAI key (or any other `CODEX_ENV_*` variables you prefer).
4. Deploy on Render’s free Node plan. Render runs `npm install && npm run build` and starts with `npm run start`.
5. (Optional) Later, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if you want persistent transcripts. Without them, the app still works with in-memory logs.

### Manual deployment

If you prefer another provider:

```bash
npm install
npm run build
PORT=3000 NODE_ENV=production SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run start
```

The Express server serves the prebuilt React bundle from `web/dist/` and exposes WebSockets at `/ws?sessionId=...`.

## How it works

- `src/session-manager.js` spawns Codex CLI inside a PTY (`node-pty`). Output is buffered per session and broadcast to all connected WebSocket clients.
- Every event (stdin, stdout, stderr, exit, session metadata) is persisted via the Supabase REST API so transcripts survive restarts.
- The React UI (`web/src`) bootstraps a session, opens a WebSocket, renders ANSI output using `ansi-to-html`, and exposes controls for approvals and interrupts.
- `render.yaml` captures a production-ready Render service using the free tier.

## Troubleshooting

- **Codex CLI not found:** Set `CODEX_EXECUTABLE` to the absolute path of the `codex` binary.
- **Supabase 401/403:** Make sure you used the *service role* key, not the anon key.
- **Long-running sessions:** Render’s free tier sleeps after inactivity. Transcripts continue to live in Supabase and are re-sent on reconnect.

## License

MIT
