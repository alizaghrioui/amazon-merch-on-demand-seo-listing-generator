(function (root) {
  const defaults = {
    gemini: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    openai: ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-luna', 'gpt-5.4', 'gpt-4.1', 'gpt-4o'],
    claude: ['claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5']
  };
  function usable(provider, model) {
    const id = typeof model === 'string' ? model : model?.id || '';
    if (provider === 'gemini') return /^gemini-/.test(id) && !/image|audio|tts|live|robotics|embedding/i.test(id);
    if (provider === 'claude') return /^claude-/.test(id) && !/embedding|audio/i.test(id);
    return /^(gpt-(?:[456])|o[134])/.test(id) && !/image|audio|realtime|transcribe|tts|search|codex|deep-research|chat-latest|instruct|cyber|rosalind/i.test(id);
  }
  function choose(provider, mode, models) {
    if (mode && !mode.startsWith('auto')) return mode;
    const eligible = (models || []).filter(model => usable(provider, model));
    const ids = eligible.map(m => typeof m === 'string' ? m : m.id);
    if (provider === 'claude') {
      const preferred = mode === 'auto-pro' ? ['claude-fable-5', 'claude-opus-5', 'claude-sonnet-5', 'claude-opus-4-8', 'claude-sonnet-4-6'] : ['claude-haiku-5-5', 'claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-sonnet-4-6'];
      return preferred.find(id => ids.includes(id)) || ids[0] || (mode === 'auto-pro' ? 'claude-sonnet-5' : 'claude-haiku-4-5-20251001');
    }
    const preferred = provider === 'gemini'
      ? (mode === 'auto-pro' ? ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-3.6-flash'] : ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-3.8-flash'])
      : (mode === 'auto-pro' ? ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-5.4', 'gpt-4.1'] : ['gpt-6-luna', 'gpt-6.1-sol', 'gpt-4o', 'gpt-4.1', 'gpt-5.4']);
    const match = preferred.find(id => ids.includes(id));
    const pro = ids.filter(id => /pro|astra/.test(id)).sort((a,b) => b.localeCompare(a,undefined,{numeric:true}));
    return match || (mode === 'auto-pro' && pro[0]) || ids[0] || preferred[0];
  }
  async function list(provider, key) {
    if (!key) throw new Error('Add an API key to load the available models.');
    let models = [], page = '';
    do {
      let url, headers;
      if (provider === 'gemini') {
        url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000${page ? '&pageToken=' + encodeURIComponent(page) : ''}`;
        headers = { 'x-goog-api-key': key };
      } else if (provider === 'claude') {
        url = `https://api.anthropic.com/v1/models?limit=1000${page ? '&after_id=' + encodeURIComponent(page) : ''}`;
        headers = { 'x-api-key': key, 'anthropic-version': '2026-10-21', 'anthropic-dangerous-direct-browser-access': 'true' };
      } else {
        url = 'https://api.openai.com/v1/models';
        headers = { Authorization: `Bearer ${key}` };
      }
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`${provider === 'gemini' ? 'Gemini' : provider === 'claude' ? 'Claude' : 'OpenAI'} ${response.status}: ${data.error?.message || 'Could not load models.'}`);
      let items;
      if (provider === 'gemini') items = (data.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => ({id:m.name.replace(/^models\//,''),label:m.displayName || m.name.replace(/^models\//,'')}));
      else if (provider === 'claude') items = (data.data || []).filter(m => m.lifecycle === 'active' && usable(provider,m.id)).map(m => ({id:m.id,label:m.display_name || m.id,capabilities:['vision']}));
      else items = (data.data || []).map(m => ({id:m.id,label:m.id}));
      models.push(...items.filter(m => usable(provider,m)));
      page = provider === 'gemini' ? data.nextPageToken || '' : provider === 'claude' && data.has_more ? data.last_id || '' : '';
    } while (page);
    return [...new Map(models.map(m => [m.id,m])).values()].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
  }
  root.MerchAI = { defaults, usable, choose, list };
})(globalThis);
