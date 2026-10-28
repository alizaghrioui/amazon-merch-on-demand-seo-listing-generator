(function (root) {
  const defaults = {
    gemini: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    openai: ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-luna', 'gpt-5.4', 'gpt-4.1', 'gpt-4o'],
    codecraft: []
  };
  function usable(provider, model) {
    const id = typeof model === 'string' ? model : model?.id || '';
    if (provider === 'gemini') return /^gemini-/.test(id) && !/image|audio|tts|live|robotics|embedding/i.test(id);
    if (provider === 'codecraft') {
      if (typeof model === 'object' && model) return (model.type === 'chat' || !model.type) && (!Array.isArray(model.capabilities) || model.capabilities.includes('vision')) && !/embedding|audio|image-generation/i.test(id);
      return Boolean(id) && !/embedding|audio|image-generation/i.test(id);
    }
    return /^(gpt-(?:[456])|o[134])/.test(id) && !/image|audio|realtime|transcribe|tts|search|codex|deep-research|chat-latest|instruct|cyber|rosalind/i.test(id);
  }
  function choose(provider, mode, models) {
    if (mode && !mode.startsWith('auto')) return mode;
    const eligible = (models || []).filter(model => usable(provider, model));
    const ids = eligible.map(m => typeof m === 'string' ? m : m.id);
    if (provider === 'codecraft') {
      if (!eligible.length) throw new Error('Load CodeCraft models with image input enabled. Add a CodeCraft API key and refresh models.');
      const idOf = item => typeof item === 'string' ? item : item.id;
      const preferred = mode === 'auto-pro'
        ? ['gemini-3.1-pro', 'claude-sonnet-5', 'claude-opus-4.8', 'gemini-3.7-flash']
        : ['gemini-3.6-flash', 'gemini-3.7-flash', 'gpt-5.6-luna', 'claude-fable-5'];
      const known = preferred.find(id => ids.includes(id));
      if (known) return known;
      const fastScore = item => {
        const id = (typeof item === 'string' ? item : item.id).toLowerCase();
        const cost = typeof item === 'object' ? Number(item.pricing?.input_per_1k || 0) + Number(item.pricing?.output_per_1k || 0) : 0;
        return (/flash|haiku|mini|lite|fast/.test(id) ? -1000 : 0) + (cost || 100);
      };
      if (mode === 'auto-pro') {
        const pro = eligible.filter(item => {
          const id = (typeof item === 'string' ? item : item.id).toLowerCase();
          return /opus|sonnet|pro|reason|astra|gpt-[456]/.test(id) || (typeof item === 'object' && item.capabilities?.includes('reasoning'));
        });
        return idOf((pro.length ? pro : eligible).slice().sort((a,b)=>fastScore(b)-fastScore(a))[0]);
      }
      return idOf(eligible.slice().sort((a,b)=>fastScore(a)-fastScore(b))[0]);
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
      const url = provider === 'gemini'
        ? `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000${page ? '&pageToken=' + encodeURIComponent(page) : ''}`
        : provider === 'codecraft' ? 'https://codecraftapi.com/v1/models' : 'https://api.openai.com/v1/models';
      const headers = provider === 'gemini' ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` };
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`${provider === 'gemini' ? 'Gemini' : provider === 'codecraft' ? 'CodeCraft API' : 'OpenAI'} ${response.status}: ${data.error?.message || 'Could not load models.'}`);
      let items;
      if (provider === 'gemini') items = (data.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => ({id:m.name.replace(/^models\//,''),label:m.displayName || m.name.replace(/^models\//,'')}));
      else if (provider === 'codecraft') items = (data.data || []).filter(m => (m.type === 'chat' || !m.type) && (!Array.isArray(m.capabilities) || m.capabilities.includes('vision'))).map(m => ({id:m.id,label:m.name && m.name !== m.id ? `${m.name} · ${m.id}` : m.id,type:m.type,capabilities:m.capabilities,pricing:m.pricing}));
      else items = (data.data || []).map(m => ({id:m.id,label:m.id}));
      models.push(...items.filter(m => usable(provider,m)));
      page = provider === 'gemini' ? data.nextPageToken || '' : '';
    } while (page);
    return [...new Map(models.map(m => [m.id,m])).values()].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
  }
  root.MerchAI = { defaults, usable, choose, list };
})(globalThis);
