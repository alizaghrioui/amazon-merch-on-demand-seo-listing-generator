(() => {
  const uniqWords = text => {
    const seen = new Set();
    return String(text || '').trim().split(/\s+/).filter(word => {
      const key = word.toLocaleLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    }).join(' ');
  };
  function generateTitles(slots = {}, limit = 60, blocklist = []) {
    const phrase = String(slots.phrase || '').trim();
    const chosen = ['tone','theme','audience','style'].map(k => String(slots[k] || '').trim()).filter(Boolean);
    const product = String(slots.product || '').trim();
    const orders = [];
    const permute=(items,start=0)=>{if(start>=items.length){orders.push([...items]);return}for(let i=start;i<items.length;i++){[items[start],items[i]]=[items[i],items[start]];permute(items,start+1);[items[start],items[i]]=[items[i],items[start]]}};
    permute([...chosen]);
    const candidates = [];
    for (let i=0;i<10;i++) {
      const middle = (orders.length ? orders[i % orders.length] : []).filter(Boolean);
      const base = [phrase, ...middle, product].filter(Boolean).join(' ');
      const title = uniqWords(base);
      if (!title || candidates.some(x => x.title.toLocaleLowerCase() === title.toLocaleLowerCase())) continue;
      const parts=[phrase,...chosen].filter(Boolean),shortTailCount=parts.filter(part=>(part.match(/[\p{L}\p{N}]+/gu)||[]).length<=2).length,longTailCount=parts.length-shortTailCount;
      candidates.push({ title, characterCount:title.length, shortTailCount, longTailCount,
        overLimit:title.length>Number(limit||60), trademarkHits:globalThis.TrademarkTools?.findMatches(title,blocklist)||[] });
    }
    return candidates.slice(0,10);
  }
  const api={generateTitles,uniqWords};globalThis.TitleBuilder=api;if(typeof module!=='undefined')module.exports=api;
})();
