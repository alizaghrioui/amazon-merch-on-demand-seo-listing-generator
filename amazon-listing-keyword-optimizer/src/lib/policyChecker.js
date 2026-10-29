(() => {
  const DEFAULT_FORBIDDEN_CLAIMS=['best seller','bestseller','#1','number one','free shipping','sale','discount','limited time','guaranteed','top rated','best quality'];
  const DEFAULT_SENSITIVE_HUMOR=['race','religion','disability'];
  const DISCLAIMER='This list is not exhaustive. Merch on Demand policies change; always check the official content guidelines and the USPTO database before publishing.';
  const contains=(text,term)=>new RegExp(`(^|[^\\p{L}\\p{N}])${String(term).replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}(?=$|[^\\p{L}\\p{N}])`,'iu').test(String(text||''));
  function checkListing(listing={}, options={}) {
    const blocklist=options.blocklist||[],library=options.library||{},claims=options.forbiddenClaims||DEFAULT_FORBIDDEN_CLAIMS,sensitive=options.sensitiveHumor||DEFAULT_SENSITIVE_HUMOR,limit=Number(options.titleLimit||60),issues=[];
    const fields={brand:String(listing.brand||''),title:String(listing.title||''),bullet1:String((listing.bullets||[])[0]||''),bullet2:String((listing.bullets||[])[1]||''),description:String(listing.description||'')};
    for(const [field,text] of Object.entries(fields)) for(const term of claims) if(contains(text,term)) issues.push({field,severity:'error',code:'forbidden-claim',message:`Forbidden claim: ${term}`});
    for(const field of ['brand','title']) if(contains(fields[field],'Amazon'))issues.push({field,severity:'error',code:'amazon-name',message:'Amazon is not allowed in Brand or Title.'});
    const pattern=/\b(?:style\s+of|inspired\s+by|parody\s+of|like)\s+([\p{L}][\p{L}\p{N}'’.-]*(?:\s+[\p{L}][\p{L}\p{N}'’.-]*)?)/giu;
    for(const [field,text] of Object.entries(fields)) for(const match of text.matchAll(pattern))issues.push({field,severity:'warning',code:'ip-reference',message:`Review possible brand, character, or person reference: ${match[0]}`});
    for(const term of sensitive) if(contains(Object.values(fields).join(' '),term))issues.push({field:'listing',severity:'warning',code:'sensitive-humor',message:'Humor targeting groups is a common rejection reason.'});
    if((fields.title.match(/[!?.,;:]{2,}|[^\p{L}\p{N}\s]{2,}/gu)||[]).length)issues.push({field:'title',severity:'warning',code:'title-punctuation',message:'Review excessive punctuation or symbols in Title.'});
    const caps=(fields.title.match(/[A-Z]/g)||[]).length,letters=(fields.title.match(/[A-Za-z]/g)||[]).length;if(letters>=8&&caps/letters>.75)issues.push({field:'title',severity:'warning',code:'title-caps',message:'Review excessive ALL CAPS in Title.'});
    if(fields.title.length>limit)issues.push({field:'title',severity:'warning',code:'title-length',message:`Title is ${fields.title.length}/${limit} characters. It was kept intact; shorten manually if required.`});
    const safe=new Set(Object.values(library).flat().map(x=>String(x).toLowerCase()));
    const phrases=fields.title.match(/\b[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){2,}\b/gu)||[];
    for(const phrase of phrases) if(!safe.has(phrase.toLowerCase())&&!blocklist.some(term=>contains(phrase,term))) issues.push({field:'title',severity:'notice',code:'custom-slogan',phrase,message:'Custom slogan: check it on tmsearch.uspto.gov'});
    for(const text of Object.values(fields)) for(const term of globalThis.TrademarkTools?.findMatches(text,blocklist)||[])issues.push({field:'listing',severity:'error',code:'trademark',message:`Potentially protected term: ${term}`});
    return {issues,disclaimer:DISCLAIMER, fields};
  }
  const api={DEFAULT_FORBIDDEN_CLAIMS,DEFAULT_SENSITIVE_HUMOR,DISCLAIMER,checkListing};globalThis.PolicyChecker=api;if(typeof module!=='undefined')module.exports=api;
})();
