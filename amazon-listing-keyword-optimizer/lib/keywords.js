(() => {
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ');
  const words = value => normalize(value).match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
  function classifyKeyword(value) { const count = words(value).length; return { count, type: count <= 2 ? 'short' : 'long' }; }
  function parseKeywords(text) {
    return uniqueKeywords(String(text || '').split(/[\n,;\t]+/));
  }
  function uniqueKeywords(values) { const seen=new Set(); return values.map(normalize).filter(k=>{const key=k.toLocaleLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true}) }
  function parseCsvKeywords(text) {
    const rows=[]; let row=[], cell='', quoted=false;
    const source=String(text||'');
    for(let i=0;i<source.length;i++){
      const ch=source[i];
      if(ch==='"'&&quoted&&source[i+1]==='"'){cell+='"';i++;continue}
      if(ch==='"'){quoted=!quoted;continue}
      if(ch===','&&!quoted){row.push(cell);cell='';continue}
      if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&source[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';continue}
      cell+=ch;
    }
    if(cell||row.length){row.push(cell);rows.push(row)}
    const first=normalize(rows[0]?.[0]).toLocaleLowerCase();
    const hasHeader=['keyword','keywords','phrase','search term','search keyword'].includes(first);
    return uniqueKeywords(rows.slice(hasHeader?1:0).map(r=>r[0]||''));
  }
  const STOP = new Set('a an and are as at be by for from has have in is it its of on or the to with this that your you amazon'.split(' '));
  function ngrams(text, min = 2, max = 4) {
    const tokens = words(text).map(w => w.toLocaleLowerCase()).filter(w => w && !STOP.has(w)); const out = new Map();
    for (let n = min; n <= max; n++) for (let i = 0; i + n <= tokens.length; i++) {
      const gram = tokens.slice(i, i + n); if (gram.every(w => STOP.has(w))) continue;
      const phrase = gram.join(' '); out.set(phrase, (out.get(phrase) || 0) + 1);
    }
    return [...out].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).map(([phrase,count])=>({ phrase,count }));
  }
  const api = { normalize, words, classifyKeyword, parseKeywords, parseCsvKeywords, uniqueKeywords, ngrams, STOP_WORDS: [...STOP] };
  globalThis.KeywordTools = api; if (typeof module !== 'undefined') module.exports = api;
})();
