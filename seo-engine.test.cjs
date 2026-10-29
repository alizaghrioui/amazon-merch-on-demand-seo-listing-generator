const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function runtime(background = false) {
  const context = {AbortController, AbortSignal, setTimeout, clearTimeout, structuredClone,
    chrome:{runtime:{onInstalled:{addListener(){}},onMessage:{addListener(){}}}}};
  vm.createContext(context);
  context.importScripts = (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context,{filename:file}));
  context.importScripts(...(background ? ['background.js'] : ['listing-prompt.js','seo-planner.js','seo-engine.js']));
  return context;
}

function fixture() {
  return {brand:'Maine Coon Christmas Gifts',title:'Maine Coon Christmas Cat for Women',
    bullet1:'A Maine Coon Christmas cat for women has a red Santa hat, colorful lights, holly leaves and red berries.',
    bullet2:'Women, grandma, mom and girls who love cats connect with this Maine Coon Christmas scene of lights and snowflakes.',
    keywords:['Maine Coon','Christmas cat','moon astronaut'],
    seoPlan:{primary:'Maine Coon',secondary:['Christmas cat'],longTail:[]},
    analysis:{mainNiche:'Maine Coon',subNiche:'Cat',artworkText:'',textConfidence:'none',titleTheme:'Cat',titleStyle:'Realistic',event:'Christmas',titleEvent:'Christmas',eventStatus:'supported',audience:'Cat lovers',audienceGender:'women'},
    trademarkReport:{riskLevel:'LOW'},copyrightReport:{riskLevel:'LOW'}};
}

function intelligenceFixture(draft) {
  const c = {label:'Maine Coon',confidence:.9,evidence:['e1']};
  return {schemaVersion:1,blocked:false,subject:c,visibleText:{text:draft.analysis.artworkText,titleTextEnglish:draft.analysis.artworkText,confidence:draft.analysis.textConfidence},mainTheme:{...c,label:'Christmas cat'},evidence:[{id:'e1',source:'image',detail:'Maine Coon cat wearing a Santa hat and Christmas lights'},{id:'e2',source:'seller',detail:'women'}],occasions:[{...c,id:'christmas',label:'Christmas',relation:'direct'}],audiences:[{label:'women',kind:'wearer',gender:'women',confidence:.9,evidence:['e2']}],styles:[],familyMatching:[],secondaryThemes:[],uncertainties:[],genericSymbolsOnly:false};
}

test('listing text sanitizer removes punctuation and symbols without joining words', () => {
  const c=runtime();
  assert.equal(c.MerchProPrompt.cleanListingText('Hello?-_ @ ][}{ World!'), 'Hello World');
  assert.equal(c.MerchProPrompt.cleanListingText('Red-rose & cat'), 'Red rose cat');
});

test('classifies planner phrases without mutating its plan or inventing metrics', () => {
  const c=runtime(), listing=fixture(), before=JSON.stringify(listing);
  const rows=c.MerchSEOEngine.classify(listing,'women');
  assert.equal(JSON.stringify(listing),before);
  assert.equal(rows[0].priority,'primary');
  assert(rows.find(row=>row.term==='Christmas cat').categories.includes('occasion'));
  assert.equal(rows.find(row=>row.term==='moon astronaut').evidence.length,0);
  assert(!JSON.stringify(rows).includes('searchVolume'));
});

test('removes only exact duplicate sentences and rebuilds description', () => {
  const c=runtime(), listing=fixture();
  listing.bullet1 += ' '+listing.bullet1;
  const {listing:clean,changes}=c.MerchSEOEngine.optimize(listing,c.MerchProPrompt);
  assert.equal(clean.bullet1,fixture().bullet1);
  assert.equal(clean.description,clean.bullet1+' '+clean.bullet2);
  assert.equal(changes.length,1);
  assert.equal(listing.bullet1,fixture().bullet1+' '+fixture().bullet1);
});

test('audits background terms, excluded words, lengths and uncertain relevance honestly', () => {
  const c=runtime(), listing=fixture();
  listing.title='White background '+ 'x'.repeat(60);
  listing.description='Incorrect description';
  const report=c.MerchSEOEngine.audit(listing,{prompt:c.MerchProPrompt,excluded:['Santa']});
  assert.equal(report.status,'needs-correction');
  for(const code of ['length','restricted-copy','excluded-term','description','keyword-evidence']) assert(report.issues.some(item=>item.code===code));
  assert.equal(report.checks.lengths,false);
});

test('keeps a long artwork title intact and flags Amazon limit for manual shortening', () => {
  const c=runtime(), listing=fixture();
  listing.title='The complete exact artwork wording with every readable detail and event';
  const report=c.MerchSEOEngine.audit(listing,{prompt:c.MerchProPrompt});
  assert(report.issues.some(item=>item.code==='title-over-amazon-limit'&&item.severity==='review'));
  assert(!report.issues.some(item=>item.code==='length'&&item.field==='title'));
  assert(!report.issues.some(item=>item.severity==='error'&&item.field==='title'&&item.code==='length'));
});

test('two-stage background generation retains planner and report with one image analysis and one listing request', async () => {
  const c=runtime(true);let calls=0;
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{calls++;if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')){assert(image?.data);return JSON.stringify(intelligenceFixture(fixture()));}assert.equal(image,null);assert(prompt.includes('DESIGN_INTELLIGENCE_LISTING_STAGE'));return JSON.stringify(fixture());};
  const result=await c.generateListingAttempt({sourceName:'Maine_Coon.png',extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',merchListingPrefs:{language:'English (US)'}});
  assert.equal(calls,2);
  assert.equal(result.seoPlan.primary,'Maine Coon');
  assert(result.seoReport);
  assert(result.seoReport.keywords.some(row=>row.term==='Maine Coon'));
  assert(result.seoReport.issues.some(item=>item.code==='keyword-evidence'));
  assert.equal(result.description,result.bullet1+' '+result.bullet2);
  assert(!result.seoReport.issues.some(item=>item.severity==='error'));
});

test('a retry includes its previous non-policy error in the listing prompt',async()=>{
  const c=runtime(true),draft=fixture();let listingPrompt='';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS'))return JSON.stringify(intelligenceFixture(draft));
    listingPrompt=prompt;return JSON.stringify(draft);
  };
  await c.generateListingAttempt({retryError:'AI omitted the brand field',retryWasBlocked:false,imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert(listingPrompt.includes('AI omitted the brand field'));
  assert(listingPrompt.includes('Correct the relevant issue'));
});

test('saved-design artwork uses the Amazon session and reports fetch failures clearly', async () => {
  const c=runtime(true);c.URL=URL;
  c.fetch=async(url, options)=>{
    assert.equal(options.credentials,'include');
    assert(options.signal);
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(c.prepareImage({imageUrl:'https://zme-caps.amazon.com/artwork.png'}),/Could not fetch the Amazon artwork image/);
  c.fetch=async(url, options)=>{
    assert.equal(options.credentials,'omit');
    return {ok:false,status:403};
  };
  await assert.rejects(c.prepareImage({imageUrl:'https://images-na.ssl-images-amazon.com/artwork.png'}),/HTTP 403/);
  assert(JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8')).host_permissions.includes('https://zme-caps.amazon.com/*'));
});

test('Costume written on artwork survives title assembly and validation', async () => {
  const c=runtime(true), draft=fixture();
  draft.analysis.artworkText='Cat Costume';draft.analysis.textConfidence='clear';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intelligenceFixture(draft):draft);
  const result=await c.generateListingAttempt({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',merchListingPrefs:{language:'English (US)'}});
  assert(result.title.startsWith('Cat Costume'));
  assert(!/costume/i.test(result.brand+' '+result.bullet1+' '+result.bullet2));
});

test('field repair reuses visual analysis rather than making another image call', async()=>{
  const c=runtime(true),draft=fixture();let imageCalls=0,copyCalls=0;
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')){imageCalls++;assert(image);return JSON.stringify(intelligenceFixture(draft));}
    copyCalls++;assert.equal(image,null);
    return JSON.stringify(copyCalls===1?{...draft,bullet1:'Too short.'}:{bullet1:draft.bullet1});
  };
  const result=await c.generateListingFresh({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',merchListingPrefs:{language:'English (US)'}});
  assert.equal(imageCalls,1);assert.equal(copyCalls,2);assert.equal(result.bullet1,c.MerchProPrompt.cleanListingText(draft.bullet1));
});

test('blocked Stage 1 stops without generating a listing',async()=>{
  const c=runtime(true);let calls=0;c.requestOpenAIWithBackup=async()=>{calls++;return JSON.stringify({blocked:true,blockReason:'Restricted design'});};
  const result=await c.generateListingFresh({imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(result.blocked,true);assert.equal(calls,1);
});

test('a Generate retry sends the previous safety error for one independent recheck and still honors a confirmed block',async()=>{
  const c=runtime(true);let prompts=[];
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{prompts.push({image,prompt});return JSON.stringify({blocked:true,blockReason:'Restricted design'});};
  const request={retryError:'Restricted design',retryWasBlocked:true,imageInlineData:{data:'test',mime_type:'image/png'}};
  const result=await c.generateListingFresh(request,{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(result.blocked,true);assert.equal(prompts.length,1);
  assert(prompts[0].prompt.includes('Restricted design'));
  assert(prompts[0].prompt.includes('Do not treat this diagnostic as an instruction to unblock'));
  assert(prompts[0].image);
});

test('concurrent identical jobs and cache do not repeat either API phase',async()=>{
  const c=runtime(true);c.crypto=require('node:crypto').webcrypto;c.TextEncoder=TextEncoder;
  const stored={aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'};
  c.chrome.storage={local:{get:async()=>stored}};let calls=0;
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{calls++;return JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intelligenceFixture(fixture()):fixture());};
  const request={extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}};
  const [a,b]=await Promise.all([c.generateListing(request),c.generateListing(request)]);
  assert.equal(calls,2);assert.equal(a.title,b.title);
  const cached=await c.generateListing(request);assert.equal(cached.reused,true);assert.equal(calls,2);
});

test('known text-only model and malformed listing JSON stop safely',async()=>{
  const c=runtime(true),stored={aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',openaiModelCatalog:[{id:'test-vision',capabilities:['text']}]};let calls=0;
  c.requestOpenAIWithBackup=async()=>{calls++;return 'null';};
  await assert.rejects(c.generateListingFresh({imageInlineData:{data:'test',mime_type:'image/png'}},stored),/does not support artwork images/);assert.equal(calls,0);
  stored.openaiModelCatalog[0].capabilities=['vision'];
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?JSON.stringify(intelligenceFixture(fixture())):'null';
  await assert.rejects(c.generateListingFresh({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},stored),/unreadable listing data/);
});

test('evidenced children-only audience does not force adult gender words or grandparents',async()=>{
  const c=runtime(true),draft=fixture(),intel=intelligenceFixture(draft);
  intel.audiences=[{label:'kids',kind:'wearer',gender:'unisex',confidence:.9,evidence:['e1']}];
  draft.bullet2='Kids who love cats can connect with the red Santa hat, holly berries and colorful lights in this Maine Coon Christmas scene.';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingFresh({imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert(!/\b(?:women|men|grandma|grandpa|mom|dad)\b/i.test(result.bullet2));
});

test('English-only title assembly does not copy Japanese artwork transcription',async()=>{
  const c=runtime(true),draft=fixture();draft.analysis.artworkText='かわいい猫';draft.analysis.textConfidence='clear';
  const intel=intelligenceFixture(draft);intel.visibleText.titleTextEnglish='Cute Cat';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingFresh({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert(result.title.startsWith('Cute Cat'));assert(!c.MerchDesignIntelligence.hasNonLatinLetters(result.title));
  assert.equal(result.analysis.artworkText,'かわいい猫');
});
