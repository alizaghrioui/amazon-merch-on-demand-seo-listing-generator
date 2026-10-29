const test=require('node:test');
const assert=require('node:assert/strict');
const trademarks=require('../lib/trademarks.js');
const listing=require('../lib/listing.js');
const library=require('../src/data/safeLibrary.js');
const builder=require('../src/lib/titleBuilder.js');
const policy=require('../src/lib/policyChecker.js');
globalThis.TrademarkTools=trademarks;
globalThis.PolicyChecker=policy;
globalThis.KeywordTools=require('../lib/keywords.js');
const base={brand:'Funny Cat Studio',title:'Funny Cat Mom Coffee Tee',bullets:['Cute cat artwork for cat lovers','Coffee and book theme for mom'],description:'Funny cat artwork for cat lovers.'};
const check=(overrides={},opts={})=>policy.checkListing({...base,...overrides},{library:library.cloneDefaults(),...opts});

test('title variations preserve full long title, remove repeated words, and report blocklist hits',()=>{
 const rows=builder.generateTitles({phrase:'Social Battery Low',tone:'Funny',theme:'Cat',audience:'Mom',style:'Cute',product:'T-Shirt'},30,['Cat']);
 assert.equal(rows.length,10);assert(rows.every(x=>x.title.length>30));assert(rows.every(x=>!(/\b(\w+)\b(?=.*\b\1\b)/i.test(x.title))));assert(rows.every(x=>x.trademarkHits.includes('Cat')));assert(rows.every(x=>x.characterCount===x.title.length));
});
test('title generator does not cut words at the configured limit',()=>{
 const row=builder.generateTitles({phrase:'A Very Long Main Design Phrase',tone:'Funny',theme:'Cat',audience:'Mom',style:'Cute',product:'T-Shirt'},15)[0];
 assert.equal(row.title,'A Very Long Main Design Phrase Funny Cat Mom Cute T-Shirt');assert(row.overLimit);
});
test('safe library defaults and migration preserve existing user data',()=>{
 assert.equal(library.cloneDefaults().funny.length,12);
 assert.deepEqual(library.migrateSafeLibrary({funny:['My custom phrase'],myCategory:['Keep me']}).funny,['My custom phrase']);
 assert.deepEqual(library.migrateSafeLibrary({funny:['My custom phrase'],myCategory:['Keep me']}).myCategory,['Keep me']);
 assert.equal(library.migrateSafeLibrary(null).themes.includes('capybara'),true);
});
test('policy checker catches forbidden claims across listing fields',()=>{
 for(const [field,value] of [['brand','Best Seller Designs'],['title','Funny Cat #1'],['bullet1','Free shipping today'],['bullet2','Best quality'],['description','Limited time discount sale']]){
  const result=check(field==='bullet1'||field==='bullet2'?{bullets:field==='bullet1'?[value,base.bullets[1]]:[base.bullets[0],value]}:{[field]:value});
  assert(result.issues.some(i=>i.code==='forbidden-claim'),`${field} should be flagged`);
 }
});
test('Amazon is prohibited in Brand and Title only',()=>{
 assert(check({brand:'Amazon Cat Club'}).issues.some(i=>i.code==='amazon-name'));
 assert(check({title:'Amazon Cat Shirt'}).issues.some(i=>i.code==='amazon-name'));
 assert(!check({description:'Amazon is mentioned here'}).issues.some(i=>i.code==='amazon-name'));
});
test('reference phrases and editable sensitive-humor terms produce warnings',()=>{
 assert(check({title:'Funny Cat inspired by Mickey'}).issues.some(i=>i.code==='ip-reference'));
 assert(check({bullets:['','Humor about disability']}).issues.some(i=>i.code==='sensitive-humor'));
 assert(!check({bullets:['','Neutral cat artwork']}).issues.some(i=>i.code==='sensitive-humor'));
});
test('title punctuation, capitalization, and over-limit copy are advisory and title remains intact',()=>{
 const title=('FUNNY CAT!!!! '+('LONG '.repeat(15))).toUpperCase();const out=check({title},{titleLimit:25});
 assert(out.issues.some(i=>i.code==='title-punctuation'));assert(out.issues.some(i=>i.code==='title-caps'));assert(out.issues.some(i=>i.code==='title-length'));
 assert.equal(out.fields.title,title);assert(!out.issues.some(i=>i.code==='length-limit'));
});
test('custom three-word slogan gets USPTO reminder and disclaimer is retained',()=>{
 const out=check({title:'My Unlisted Slogan Cats'});
 assert(out.issues.some(i=>i.code==='custom-slogan'));
 assert.match(out.disclaimer,/not exhaustive/i);assert.match(out.disclaimer,/USPTO/i);
});
test('policy scoring has a configurable weight and normalized weights total 100 percent',()=>{
 const scored=listing.analyze(base,[],[],[],listing.DEFAULT_LIMITS,{perField:3,total:5},{...{library:library.cloneDefaults()},...{policyWeight:25,enabled:true}});
 assert.equal(Object.values(scored.scoreWeights).reduce((a,b)=>a+b,0),1);
 assert.equal(scored.scoreWeights.policySafety,.25);assert.ok('policySafety' in scored.scoreBreakdown);
});
test('title overage does not reduce the score or cut Title; disabling mode removes policy weight',()=>{
 const title='A very long complete design title that remains unchanged beyond the normal character limit';
 const knownLibrary=library.cloneDefaults();knownLibrary.themes.push(title);
 const enabled=listing.analyze({...base,title},[],[],[],listing.DEFAULT_LIMITS,{perField:3,total:5},{library:knownLibrary,policyWeight:20,enabled:true});
 const disabled=listing.analyze({...base,title},[],[],[],listing.DEFAULT_LIMITS,{perField:3,total:5},{library:knownLibrary,policyWeight:20,enabled:false});
 assert.equal(enabled.policy.fields.title,title);assert(enabled.policy.issues.some(i=>i.code==='title-length'));
 assert.equal(enabled.scoreBreakdown.policySafety,100);assert.equal(disabled.policy,null);assert.equal(disabled.scoreWeights.policySafety,0);
 assert.equal(Object.values(disabled.scoreWeights).reduce((a,b)=>a+b,0),1);
});
