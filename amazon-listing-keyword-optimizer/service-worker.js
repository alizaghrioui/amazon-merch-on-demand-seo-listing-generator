const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const DEFAULTS = { settings: { marketplace: 'www.amazon.com', limits: { title: 60, brand: 50, bullet: 256, description: 2000 }, thresholds: { perField: 3, total: 5 }, delayMs: 350, theme: 'light', language: 'en' }, blocklist: ['Disney','Mickey','Marvel','Nike','Pokemon','Pokémon','Nintendo','Star Wars','NFL','NBA','Harry Potter','Barbie','Hello Kitty','Super Bowl','Coca Cola','Adidas','Taylor Swift','Lego','Walt Disney'] };
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  const state = await chrome.storage.local.get(['settings','blocklist','projects']);
  const patch = {}; for (const [k,v] of Object.entries(DEFAULTS)) if (state[k] === undefined) patch[k] = v;
  if (state.projects === undefined) patch.projects = [{ id: crypto.randomUUID(), name: 'My first niche', keywords: [], important: [], listing: { title:'',brand:'',bullets:['',''],description:'' }, history: [] }];
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
});
chrome.action.onClicked.addListener(tab => chrome.sidePanel.open({ windowId: tab.windowId }));
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_PANEL') { chrome.sidePanel.open({ windowId: sender.tab.windowId }).then(() => sendResponse({ok:true})).catch(e=>sendResponse({error:e.message})); return true; }
  if (msg.type === 'EXTRACT_VISIBLE') { chrome.storage.local.set({ extractorData: msg.payload }); chrome.sidePanel.open({windowId:sender.tab.windowId}).catch(()=>{}); sendResponse({ok:true}); return; }
  if (msg.type === 'EXPAND_KEYWORDS') { expandKeywords(msg.seed, msg.marketplace, msg.jobId, msg.delayMs).then(sendResponse).catch(e=>sendResponse({error:e.message})); return true; }
  if (msg.type === 'CANCEL_JOB') { chrome.storage.local.set({ cancelledJob: msg.jobId }); sendResponse({ok:true}); return; }
  if (msg.type === 'INDEX_KEYWORDS') { checkIndexing(msg).then(sendResponse).catch(e=>sendResponse({error:e.message})); return true; }
  if (msg.type === 'STOP_INDEX') { chrome.storage.local.set({ stopIndex: true }); sendResponse({ok:true}); return; }
});
async function expandKeywords(seed, marketplace = 'www.amazon.com', jobId, delayMs = 350) {
  if (!['www.amazon.com','www.amazon.co.uk','www.amazon.de'].includes(marketplace)) marketplace = 'www.amazon.com';
  const suggestions = new Set(), suffixes = [' ', ...'abcdefghijklmnopqrstuvwxyz0123456789'].map(x => x === ' ' ? '' : ` ${x}`);
  for (const suffix of suffixes) {
    const flags = await chrome.storage.local.get('cancelledJob'); if (flags.cancelledJob === jobId) return { cancelled:true, suggestions:[...suggestions] };
    const q = `${seed}${suffix}`.trim();
    try {
      const mkt = marketplace.includes('.co.uk') ? 2 : marketplace.includes('.de') ? 3 : 1;
      const url = `https://completion.amazon.com/search/complete?method=completion&mkt=${mkt}&search-alias=aps&q=${encodeURIComponent(q)}`;
      const response = await fetch(url, { headers:{'Accept':'application/json'} }); if (!response.ok) throw new Error(`Amazon suggestions returned ${response.status}`);
      const data = await response.json(); (Array.isArray(data?.[1]) ? data[1] : []).forEach(v => { const text = String(v).trim(); if (text) suggestions.add(text); });
    } catch (error) { if (!suggestions.size && suffix === '') console.warn('Autocomplete request failed', error); }
    if (suffix !== suffixes.at(-1)) await wait(Math.max(300, Number(delayMs)||350));
  }
  return { suggestions:[...suggestions], error:suggestions.size?undefined:'Amazon autocomplete returned no suggestions. Check your connection and try again.' };
}
function waitTab(tabId, timeout=18000) { return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(new Error('Amazon page load timed out'));},timeout); const listener=(id,info)=>{if(id===tabId&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve();}};chrome.tabs.onUpdated.addListener(listener);chrome.tabs.get(tabId).then(t=>{if(t.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve();}}).catch(reject); }); }
async function checkIndexing({ asin, keywords, marketplace='www.amazon.com', delayMs=2500 }) {
  if (!['www.amazon.com','www.amazon.co.uk','www.amazon.de'].includes(marketplace)) marketplace = 'www.amazon.com';
  await chrome.storage.local.set({ stopIndex:false }); const results=[];
  for (const keyword of keywords) {
    if ((await chrome.storage.local.get('stopIndex')).stopIndex) break;
    const tab = await chrome.tabs.create({ url:`https://${marketplace}/s?k=${encodeURIComponent(`${asin} ${keyword}`)}`, active:false });
    try {
      await waitTab(tab.id);
      const [data] = await chrome.scripting.executeScript({ target:{tabId:tab.id}, func: expected => {
        const body = (document.body?.innerText || '').toLowerCase(); if (/robot check|captcha|enter the characters|sorry, we just need to make sure/.test(body)) return {state:'unknown',note:'Amazon displayed a captcha or verification page.'};
        const found = [...document.querySelectorAll('[data-component-type="s-search-result"][data-asin]')].some(el=>el.getAttribute('data-asin')===expected); return {state:found?'indexed':'not-indexed',note:found?'ASIN appeared in the results.':'ASIN was not found in the visible results.'};
      }, args:[asin] });
      results.push({keyword,...data.result,checkedAt:new Date().toISOString()});
      if(data.result?.state==='unknown'&&/captcha|verification/i.test(data.result?.note||'')) break;
    } catch (error) { results.push({keyword,state:'unknown',note:error.message,checkedAt:new Date().toISOString()}); }
    finally { chrome.tabs.remove(tab.id).catch(()=>{}); }
    if (keyword !== keywords.at(-1)) await wait(Math.max(2000, Number(delayMs)||2500));
  }
  return {results,stopped:(await chrome.storage.local.get('stopIndex')).stopIndex};
}
