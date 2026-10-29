(() => {
  const DEFAULT_LIMITS = { title: 60, brand: 50, bullet: 256, description: 2000 };
  const fields = listing => ({ title: listing.title || '', brand: listing.brand || '', bullets: listing.bullets || [], description: listing.description || '' });
  const contains = (haystack, needle) => new RegExp(`(^|[^\\p{L}\\p{N}])${String(needle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(haystack);
  function analyze(listing, keywords, important = [], blocklist = [], limits = DEFAULT_LIMITS, thresholds = { perField: 3, total: 5 }) {
    const x = fields(listing), bulletText = x.bullets.join(' '), all = [x.title,x.brand,...x.bullets,x.description];
    const placement = important.map(keyword => ({ keyword, title: contains(x.title,keyword), brand: contains(x.brand,keyword), bullets: contains(bulletText,keyword), description: contains(x.description,keyword) }));
    const used = (keywords || []).filter(k => all.some(t => contains(t,k)));
    const short = used.filter(k => KeywordTools.classifyKeyword(k).type === 'short').length;
    const long = used.length-short;
    const stuffing = (keywords || []).flatMap(k => {
      const escaped=String(k).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,'giu');
      const counts = all.map(t => [...t.matchAll(re)].length);
      return counts.some(n => n > thresholds.perField) || counts.reduce((a,b)=>a+b,0) > thresholds.total ? [{ keyword:k, counts, total:counts.reduce((a,b)=>a+b,0) }] : [];
    });
    const duplicateSentences = [];
    const split = text => String(text).split(/[.!?\n]+/).map(s=>s.trim().toLowerCase()).filter(Boolean);
    const bulletSentences = new Set(x.bullets.flatMap(split));
    for (const sentence of split(x.description)) if (bulletSentences.has(sentence)) duplicateSentences.push(sentence);
    const trademarkHits = TrademarkTools.findMatches(all.join(' '), blocklist);
    const lengthIssues = [{name:'title', value:x.title, limit:limits.title},{name:'brand',value:x.brand,limit:limits.brand},...x.bullets.map((value,i)=>({name:`bullet ${i+1}`,value,limit:limits.bullet})),{name:'description',value:x.description,limit:limits.description}].filter(f=>f.value.length>f.limit);
    const inTitleBrand = important.filter(k=>contains(x.title,k)||contains(x.brand,k)).length;
    const coverage = keywords?.length ? Math.round(used.length / keywords.length * 100) : 0;
    const priority = important.length ? Math.round(inTitleBrand / important.length * 100) : 100;
    const noStuffing = stuffing.length ? 0 : 100, mix = used.length ? Math.min(100, Math.round(Math.min(short,long)/Math.max(short,long,1)*100)+40) : 50;
    const trademarkScore = trademarkHits.length ? 0 : 100, lengthScore = lengthIssues.length ? 0 : 100;
    const scoreBreakdown = { coverage, placementPriority:priority, noStuffing, tailMix:mix, trademarkSafety:trademarkScore, lengthLimits:lengthScore };
    const hasCopy=all.some(t=>String(t).trim());
    const score = hasCopy ? Math.round(coverage*.30 + priority*.20 + noStuffing*.15 + mix*.10 + trademarkScore*.10 + lengthScore*.15) : 0;
    const suggestions=[]; if(!hasCopy) suggestions.push('Add listing copy to begin the evaluation.'); if(!(keywords||[]).length) suggestions.push('Add relevant keywords to the workspace for a useful coverage score.'); else if(coverage<100) suggestions.push('Add relevant workspace keywords naturally.'); if(priority<100) suggestions.push('Place starred keywords in Title or Brand where they fit naturally.'); if(stuffing.length) suggestions.push('Reduce repeated keywords to avoid stuffing.'); if(trademarkHits.length) suggestions.push(`Review potentially protected terms: ${trademarkHits.join(', ')}.`); if(lengthIssues.length) suggestions.push('Shorten fields that exceed their configured character limits.'); if(duplicateSentences.length) suggestions.push('The description repeats bullet wording; this is informational and may be intentional.');
    return { score, scoreBreakdown, placement, used, shortCount:short, longCount:long, stuffing, duplicateSentences:[...new Set(duplicateSentences)], trademarkHits, lengthIssues, suggestions };
  }
  function fromTemplate() { return { brand:'[Niche or theme] [audience]', title:'[Main design wording] [relevant niche]', bullets:['[Describe visible design details and intended audience]','[Add relevant use, season, or occasion]'], description:'[Title]. [Bullet 1]. [Bullet 2]. [Optional call to action].' }; }
  const api={DEFAULT_LIMITS,fields,analyze,fromTemplate}; globalThis.ListingTools=api; if(typeof module!=='undefined') module.exports=api;
})();
