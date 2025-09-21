const { MemoryTranscriptStore } = require('./memory');
const { SupabaseTranscriptStore } = require('./supabase');

function buildTranscriptStore(config = {}) {
  if (config.transcriptStore) {
    return config.transcriptStore;
  }

  const url = config.supabaseUrl || process.env.SUPABASE_URL;
  const serviceKey = config.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = config.supabaseTable || process.env.SUPABASE_TRANSCRIPTS_TABLE;

  if (url && serviceKey) {
    return new SupabaseTranscriptStore({ url, serviceKey, table });
  }

  return new MemoryTranscriptStore();
}

module.exports = { buildTranscriptStore };
