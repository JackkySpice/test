const DEFAULT_TABLE = 'codex_transcripts';

class SupabaseTranscriptStore {
  constructor({ url, serviceKey, table = DEFAULT_TABLE, fetchImpl = fetch }) {
    if (!url || !serviceKey) {
      throw new Error('Supabase URL and service role key are required for SupabaseTranscriptStore');
    }
    this.url = url.replace(/\/$/, '');
    this.serviceKey = serviceKey;
    this.table = table;
    this.fetch = fetchImpl;
  }

  async append(sessionId, event) {
    const payload = {
      session_id: sessionId,
      event_type: event.type,
      payload: event,
      created_at: event.at || new Date().toISOString()
    };

    const response = await this.fetch(`${this.url}/rest/v1/${this.table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.serviceKey,
        Authorization: `Bearer ${this.serviceKey}`,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase insert failed: ${response.status} ${text}`);
    }
  }

  async getTranscript(sessionId) {
    const response = await this.fetch(
      `${this.url}/rest/v1/${this.table}?session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc`,
      {
        headers: {
          apikey: this.serviceKey,
          Authorization: `Bearer ${this.serviceKey}`,
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase fetch failed: ${response.status} ${text}`);
    }

    const records = await response.json();
    return Array.isArray(records) ? records.map((row) => row.payload) : [];
  }
}

module.exports = {
  SupabaseTranscriptStore,
  DEFAULT_TABLE
};
