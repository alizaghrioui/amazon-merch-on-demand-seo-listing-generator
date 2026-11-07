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
  context.importScripts(...(background ? ['background.js'] : ['listing-prompt.js','seo-planner.js','seo-engine.js','listing-optimizer.js']));
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

test('all listing prompts force English and translate foreign artwork wording',()=>{
  const c=runtime();
  const full=c.MerchProPrompt.buildPrompt({language:'Japanese',phrase:'こんにちは',rules:'Escribe en español'});
  const fast=c.MerchProPrompt.buildFastPrompt({language:'French',phrase:'Bonjour'});
  assert.match(full,/customer-facing listing field in English only/i);
  assert.match(full,/Translate non-English artwork wording/i);
  assert.match(full,/preserve original-language transcription only in internal analysis\.artworkText/i);
  assert.match(fast,/listing fields must be English only/i);
  assert.match(fast,/Translate non-English artwork text/i);
});

test('both prompt modes use descriptive example style without copying example facts',()=>{
  const c=runtime();
  for(const prompt of [c.MerchProPrompt.buildPrompt({}),c.MerchProPrompt.buildFastPrompt({})]){
    assert.match(prompt,/two or three distinctive visible details/i);
    assert.match(prompt,/complementary subject or theme phrase/i);
    assert.match(prompt,/not facts about this image/i);
    assert.match(prompt,/75–255 characters/i);
  }
});

test('optimizer keeps the verified niche first and enforces title and brand caps',()=>{
  const c=runtime();
  const title=c.MerchListingOptimizer.title({niche:'Funny Sarcastic Frog',phrase:"I May Look Calm But In My Head I've Slapped You 3 Times",event:'Thanksgiving',theme:'Autumn',funny:true});
  const brand=c.MerchListingOptimizer.brand({niche:'Funny Sarcastic Frog',subject:'Funny Sarcastic Frog',brand:'Frog Humor Gifts',title});
  assert(title.startsWith('Funny Sarcastic Frog'));assert(title.length<=60);assert(!title.includes("Slapped You 3 Times"));
  assert(brand.length<50);assert(brand.endsWith('Apparel Co.'));assert.equal(brand,brand.toLocaleLowerCase().replace(/\b\p{L}/gu,letter=>letter.toLocaleUpperCase()));assert(brand.toLowerCase().includes('frog'));assert(!/gifts?/i.test(brand));assert(brand.split(/\s+/).some(word=>!title.toLowerCase().includes(word.toLowerCase())));
});

test('title removes repeated theme words and keeps only evidenced draft descriptors',()=>{
  const c=runtime();
  const title=c.MerchListingOptimizer.title({niche:'Festive Shark',theme:'Festive Lights',suggested:'Christmas Shark Lights Ocean Predator Colorful Teeth',evidence:'Shark with colorful lights around its teeth',max:60});
  assert.equal(title,'Festive Shark Lights Colorful Teeth');
  assert.doesNotMatch(title,/Christmas|Ocean|Predator|Festive.*Festive/);
});

test('title keeps a 46–60 character verified niche complete and selects one seller phrase',()=>{
  const c=runtime();
  const niche='Science Teacher Proton Positive Chemistry Quote';
  assert(niche.length>45&&niche.length<=60);
  const keywords=['Science Teacher','Chemistry Teacher','Biology Teacher','Physics Teacher','STEM Teacher'];
  const title=c.MerchListingOptimizer.title({niche,phrase:'Think Like a Proton',keywords,max:60});
  assert(title.startsWith(niche));
  assert(title.length<=60);
  assert.doesNotMatch(title,/Biology|Physics|STEM/);
  const repeated='Science Teacher Chemistry Teacher';
  assert(c.MerchListingOptimizer.title({niche:repeated,max:60}).startsWith(repeated));
  assert.throws(()=>c.MerchListingOptimizer.title({niche:niche+' With Extra Words',max:60}),/too long/i);
});

test('title niche falls back to the verified visual subject when a filename niche exceeds 60',()=>{
  const c=runtime();
  const selected=c.MerchListingOptimizer.titleNiche({filenameNiche:'Science Teacher Chemistry Teacher Biology Teacher Physics Teacher STEM Teacher',subject:'Proton Science Quote'});
  assert.equal(selected,'Proton Science Quote');
  assert.equal(c.MerchListingOptimizer.titleNiche({filenameNiche:'Science Teacher Chemistry Teacher',subject:'Proton Science Quote'}),'Proton Science Quote');
  assert.equal(c.MerchListingOptimizer.titleNiche({sellerNiche:['Long '.repeat(15),'Science Teacher'],filenameNiche:'Proton Quote',subject:'Proton'}),'Science Teacher');
  assert.throws(()=>c.MerchListingOptimizer.titleNiche({filenameNiche:'Science Teacher '.repeat(6),subject:'Proton Science Quote '.repeat(5)}),/too long/i);
});

test('brand uses the core niche, a distinct complementary term, and no forced Gifts',()=>{
  const c=runtime();
  const brand=c.MerchListingOptimizer.brand({niche:'Maine Coon',subject:'Maine Coon cat',brand:'Maine Coon Christmas Gifts',title:'Maine Coon Christmas Cat For Women'});
  assert.equal(brand,'Maine Coon Lovers Apparel Co.');assert(brand.length<50);assert(!/gifts?/i.test(brand));
});

test('Bullet 1 starts with all original artwork words and ends with niche-relevant SEO phrases',()=>{
  const c=runtime(), artwork="I MAY LOOK CALM BUT IN MY HEAD I'VE SLAPPED YOU 3 TIMES";
  const result=c.MerchListingOptimizer.bullet1({artworkText:artwork,confidence:'clear',body:'A funny frog wears red glasses and a polka dot bow.',niche:'Funny Frog',subject:'frog',keywords:['Funny frog humor','red glasses','unrelated space art'],max:255});
  assert.equal(result.text.slice(0,c.MerchProPrompt.cleanListingText(artwork).length).toLowerCase(),c.MerchProPrompt.cleanListingText(artwork).toLowerCase());
  assert(result.text.endsWith(result.keywords.join(', ')));assert(result.keywords.includes('Funny frog humor'));assert(!result.keywords.includes('unrelated space art'));
  assert(!/Typography|Cartoon/i.test(result.text));
});

test('Bullet 1 removes star rating symbols while preserving its readable wording',()=>{
  const c=runtime(),artwork='WOMEN ★☆☆☆☆ TOO BUSY THRIVING, TRY AGAIN LATER';
  const result=c.MerchListingOptimizer.bullet1({artworkText:artwork,confidence:'clear',body:'A sarcastic one star rating graphic pairs with a witty workplace statement.',niche:'Coworkers',subject:'Coworkers',keywords:['coworker humor'],max:255});
  assert(!/[★☆⭐]/u.test(result.text));
  assert(result.text.startsWith('WOMEN TOO BUSY THRIVING'));
  assert(result.text.includes('TRY AGAIN LATER'));
  assert(result.text.includes('one star rating graphic'));
});

test('Bullet 1 trims generated detail before dropping the required niche keyword',()=>{
  const c=runtime(),artwork='COWORKERS LOUD AND ANNOYING WOULD AVOID';
  const result=c.MerchListingOptimizer.bullet1({artworkText:artwork,confidence:'clear',body:'A sarcastic one star rating graphic with five outlined stars and a bold workplace phrase. '.repeat(4),niche:'Coworkers',subject:'Coworkers',keywords:['coworker humor','workplace humor','sarcastic coworker'],max:255});
  assert(result.text.length<=255);
  assert(result.text.startsWith(artwork));
  assert(result.text.endsWith(result.keywords.join(', ')));
  assert(result.keywords.length>=1);
});

test('prohibited review wording is normalized to rating in all generated fields',()=>{
  const c=runtime();
  const listing={title:'Coworkers One Star Review',bullet1:'One star review graphic for coworkers.',bullet2:'Funny coworkers rating reviews.',keywords:['coworker reviews']};
  assert.equal(c.MerchProPrompt.replaceUnsubstantiatedReviewTerms(listing,'COWORKERS LOUD AND ANNOYING'),true);
  assert.equal(listing.title,'Coworkers One Star Rating');
  assert.equal(listing.bullet1,'One star rating graphic for coworkers.');
  assert.equal(listing.bullet2,'Funny coworkers rating ratings.');
  assert.deepEqual(Array.from(listing.keywords),['coworker ratings']);
  const exact={bullet1:'The artwork literally says REVIEW',keywords:['review design']};
  assert.equal(c.MerchProPrompt.replaceUnsubstantiatedReviewTerms(exact),true);
  assert.equal(exact.bullet1,'The artwork literally says RATING');
  assert.deepEqual(Array.from(exact.keywords),['rating design']);
});

test('Bullet 1 refuses to truncate original artwork wording over the character limit',()=>{
  const c=runtime();
  assert.throws(()=>c.MerchListingOptimizer.bullet1({artworkText:'word '.repeat(60),confidence:'clear',body:'',niche:'word',max:255}),/complete artwork wording exceeds/i);
});

test('Bullet 1 keeps a niche SEO phrase at the end when the body already uses that phrase',()=>{
  const c=runtime();
  const result=c.MerchListingOptimizer.bullet1({body:'Maine Coon cats are shown with red holly leaves and glowing-free winter lights.',niche:'Maine Coon',subject:'Maine Coon cat',keywords:['Maine Coon'],max:255});
  assert.equal(result.keywords[0],'Maine Coon');assert(result.text.endsWith('Maine Coon'));
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

test('audit flags titles over 60 characters for the generator quality checker', () => {
  const c=runtime(), listing=fixture();
  listing.title='The complete exact artwork wording with every readable detail and event';
  const report=c.MerchSEOEngine.audit(listing,{prompt:c.MerchProPrompt});
  assert(report.issues.some(item=>item.code==='title-over-amazon-limit'&&item.severity==='review'));
  assert(!report.issues.some(item=>item.code==='length'&&item.field==='title'));
  assert(!report.issues.some(item=>item.severity==='error'&&item.field==='title'&&item.code==='length'));
});

test('two-stage background generation retains planner and report with one image analysis and one listing request', async () => {
  const c=runtime(true);let calls=0;const prompts=[];
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{calls++;prompts.push(prompt);if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')){assert(image?.data);return JSON.stringify(intelligenceFixture(fixture()));}assert.equal(image,null);assert(prompt.includes('DESIGN_INTELLIGENCE_LISTING_STAGE'));return JSON.stringify(fixture());};
  const result=await c.generateListingAttempt({sourceName:'Maine_Coon.png',extraKeywords:'women',language:'French',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',merchListingPrefs:{language:'Japanese'},merchBestSellerLibrary:{enabled:true,titles:['Old reference must not affect listing']}});
  assert.equal(calls,2);
  assert(prompts.some(prompt=>/customer-facing listing field in English only/i.test(prompt)));
  assert(prompts.some(prompt=>/audiences of kind wearer for targeting/i.test(prompt)));
  assert.equal(result.seoPlan.primary,'Maine Coon');
  assert(result.seoReport);
  assert(result.seoReport.keywords.some(row=>row.term==='Maine Coon'));
  assert(result.seoReport.issues.some(item=>item.code==='keyword-evidence'));
  assert.equal(result.description,result.bullet1+' '+result.bullet2);
  assert(result.title.startsWith('Maine Coon'));assert(result.title.length<=60);
  assert(result.brand.length<50);assert(result.brand.includes('Maine Coon'));assert(!/gifts?/i.test(result.brand));
  assert(!result.title.includes('Funny Maine Coon Lover Gift'));
  assert(!result.seoReport.issues.some(item=>item.severity==='error'));
});

test('two-stage generation validates the same full or fallback niche used in the Title',async()=>{
  for(const filenameNiche of [
    'Maine Coon Christmas Cat Wearing Red Santa Hat',
    'Maine Coon Christmas Cat Wearing Red Santa Hat With Colorful Lights'
  ]){
    const c=runtime(true),draft=fixture(),intel=intelligenceFixture(draft);
    intel.filenameNiche={label:filenameNiche,confidence:.9,evidence:['e1']};
    const sourceName=filenameNiche.replace(/ /g,'-')+'.png';
    c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
    const result=await c.generateListingAttempt({sourceName,imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
    const expected=filenameNiche.length<=60?filenameNiche:'Maine Coon';
    assert(result.title.startsWith(expected),result.title);
    assert(result.title.length<=60);
    assert.equal(result.analysis.mainNiche,expected);
  }
});

test('explicit Science Teacher Main Niche leads the proton Title while Keywords stay secondary',async()=>{
  const c=runtime(true),draft=fixture();
  const artwork='THINK LIKE A PROTON STAY POSITIVE';
  const notes='Chemistry Teacher, Biology Teacher, Physics Teacher, STEM Teacher, Middle School Science Teacher, High School Science Teacher, Elementary Science Teacher, Physical Science Teacher, Life Science Teacher, Earth Science Teacher, Environmental Science Teacher, Anatomy Teacher, Science Lab Teacher, General Science Teacher';
  draft.brand='Proton Science Quote Lab Apparel Co.';
  draft.bullet1=`${artwork} A proton symbol and positive charge wordplay connect the phrase to science and chemistry lessons.`;
  draft.bullet2='Science teachers and STEM educators can connect with the proton wordplay and its positive charge theme in classroom science.';
  draft.keywords=['Science Teacher','proton quote'];
  draft.seoPlan={primary:'Science Teacher',secondary:['proton quote'],longTail:[]};
  draft.analysis={mainNiche:'Proton Science Quote',subNiche:'Science Teacher',artworkText:artwork,textConfidence:'clear',titleTheme:'Science',titleStyle:'',event:'',titleEvent:'',eventStatus:'none',audience:'science educators',audienceGender:'unisex'};
  const intel={schemaVersion:1,blocked:false,
    subject:{label:'Proton Science Quote',confidence:.9,evidence:['e1']},
    verifiedMainNiche:{label:'Science Teacher',confidence:.9,evidence:['e1']},
    relevantSellerKeywords:[{label:'Chemistry Teacher',confidence:.85,evidence:['e1']}],
    filenameNiche:{label:'Science Teacher Chemistry Teacher Biology Teacher',confidence:.9,evidence:['e1']},
    visibleText:{text:artwork,titleTextEnglish:artwork,confidence:'clear'},titlePhrase:'THINK LIKE A PROTON',
    mainTheme:{label:'Science',confidence:.9,evidence:['e1']},
    evidence:[{id:'e1',source:'image',detail:'Proton symbol with positive charge wording'}],
    occasions:[],audiences:[],styles:[],familyMatching:[],secondaryThemes:[],uncertainties:[],genericSymbolsOnly:false};
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingAttempt({sourceName:'Science-Teacher-Chemistry-Teacher-Biology-Teacher.png',mainNiche:'Science Teacher',extraKeywords:notes,imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(result.title,'Science Teacher Think Like a Proton Stay Positive');
  assert(result.title.length<=60);
  assert.doesNotMatch(result.title,/Biology|Physics|Anatomy|Earth Science/i);
  assert.match(result.brand,/Chemistry/i);
  assert(result.bullet1.startsWith(artwork));
  assert(!result.keywords.some(term=>/Biology Teacher|Anatomy Teacher|Earth Science Teacher/i.test(term)));
  assert.deepEqual(Array.from(result.bullet1SEOKeywords),[]);
  assert.match(result.bullet2,/science teachers/i);
  assert.equal(result.description,result.bullet1+' '+result.bullet2);
  assert.equal(result.analysis.mainNicheSource,'seller');
});

test('a later image-qualified seller phrase becomes the Title niche when the first is unrelated',async()=>{
  const c=runtime(true),draft=fixture(),intel=intelligenceFixture(draft);
  intel.relevantSellerKeywords=[{label:'Christmas Cat',confidence:.9,evidence:['e1']}];
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingAttempt({extraKeywords:'Golden Retriever, Christmas Cat',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert(result.title.startsWith('Christmas Cat'),result.title);
  assert(result.title.length<=60);
  assert.equal(result.analysis.mainNiche,'Christmas Cat');
  assert(![result.title,result.brand,result.bullet1,result.bullet2,...result.keywords].join(' ').includes('Golden Retriever'));
});

test('blank Main Niche uses the first artwork-matched Keyword',async()=>{
  const c=runtime(true),draft=fixture(),intel=intelligenceFixture(draft);
  intel.relevantSellerKeywords=[{label:'Christmas Cat',confidence:.9,evidence:['e1']}];
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingAttempt({mainNiche:'',extraKeywords:'Christmas Cat, Winter Cat',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert(result.title.startsWith('Christmas Cat'),result.title);
  assert.equal(result.analysis.mainNicheSource,'keywords');
});

test('blank Main Niche repairs the proton listing from a filename-led, fragmented draft',async()=>{
  const c=runtime(true),draft=fixture();
  const notes='Science Teacher, Chemistry Teacher, Biology Teacher, Physics Teacher, STEM Teacher, Middle School Science Teacher, High School Science Teacher, Elementary Science Teacher, Physical Science Teacher, Life Science Teacher, Earth Science Teacher, Environmental Science Teacher, Anatomy Teacher, Science Lab Teacher, General Science Teacher';
  const lettering='Th I N K LIKE A PROTON, STAY POSITIVE';
  const claim=(label,evidence=['e1'])=>({label,confidence:.9,evidence});
  const intel={schemaVersion:1,blocked:false,evidence:[{id:'e1',source:'image',detail:'Atom diagram with a proton and positive charge'},{id:'e2',source:'text',detail:lettering}],
    subject:claim('Proton quote'),filenameNiche:claim('Think Positive Proton'),
    relevantSellerKeywords:[claim('Physics Teacher'),claim('Biology Teacher')],
    visibleText:{text:lettering,titleTextEnglish:lettering,confidence:'clear'},titlePhrase:'Th I N K LIKE A PROTON',
    mainTheme:claim('Science'),secondaryThemes:[],interpretation:'A proton positive charge science pun',styles:[],genericSymbolsOnly:false,animalTreatment:'none',occasions:[],audiences:[],familyMatching:[],uncertainties:[]};
  draft.title='Think Positive Proton Th I N K Like A Proton';
  draft.brand='Think Positive Proton Apparel Co.';
  draft.bullet1='Th I N K LIKE A PROTON STAY POSITIVE. The atom and positive charge make a simple science joke for chemistry teachers. Physics teacher science humor atom physics element THINK POSITIVE PROTON';
  draft.bullet2='Science teachers and physics teachers can use this proton wordplay to celebrate the positive side of science and the atom illustration. science teacher chemistry teacher physics keyword';
  draft.keywords=['Science Teacher','Biology Teacher','Physics Teacher'];
  draft.seoPlan={primary:'Think Positive Proton',secondary:['Biology Teacher'],longTail:[]};
  draft.analysis={mainNiche:'Think Positive Proton',subNiche:'Science Teacher',artworkText:lettering,textConfidence:'clear',titleTheme:'Science',titleStyle:'',event:'',titleEvent:'',eventStatus:'none',audience:'science teachers',audienceGender:'unisex'};
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingAttempt({sourceName:'THINK_POSITIVE_PROTON_NAVY_ELEMENT_ATOM_HUMOR.png',mainNiche:'',extraKeywords:notes,imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(result.analysis.mainNicheSource,'keywords');
  assert.equal(result.analysis.mainNiche,'Science Teacher');
  assert(result.title.startsWith('Science Teacher Think Like a Proton Stay Positive'),result.title);
  assert(result.title.length<=60);
  assert(result.brand.startsWith('Science Teacher'),result.brand);
  assert.match(result.bullet1,/^THINK LIKE A PROTON,? STAY POSITIVE\b/);
  assert.doesNotMatch(result.bullet1,/Th I N K|Physics teacher science humor atom physics element/i);
  assert.match(result.bullet2,/science teachers/i);
  assert.doesNotMatch(result.bullet2,/physics keyword/i);
  assert.doesNotMatch([result.title,result.brand,result.bullet1,result.bullet2,...result.keywords].join(' '),/Biology Teacher|Anatomy Teacher|Life Science Teacher/i);
  assert.deepEqual(Array.from(result.bullet1SEOKeywords),[]);
  assert.equal(result.description,result.bullet1+' '+result.bullet2);
});

test('unsupported explicit Main Niche fails visibly before listing copy is requested',async()=>{
  const c=runtime(true),intel=intelligenceFixture(fixture());let copyCalls=0;
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS'))return JSON.stringify(intel);
    copyCalls++;return JSON.stringify(fixture());
  };
  await assert.rejects(c.generateListingAttempt({mainNiche:'Biology Teacher',extraKeywords:'Christmas Cat, Winter Cat',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'}),/Main Niche.*not supported by the scanned design/);
  assert.equal(copyCalls,0);
  await assert.rejects(c.generateListingAttempt({mainNiche:'Science Teacher, Biology Teacher',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'}),/Main Niche must be one phrase/);
});

test('unsupported teacher specializations in generated copy are rejected for repair',async()=>{
  const c=runtime(true),draft=fixture(),intel=intelligenceFixture(draft);
  intel.relevantSellerKeywords=[{label:'Christmas Cat',confidence:.9,evidence:['e1']}];
  draft.bullet2='Biology teachers who love cats can connect with this Maine Coon Christmas scene of lights, holly leaves and snowflakes.';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  await assert.rejects(c.generateListingAttempt({extraKeywords:'Christmas Cat, Biology Teacher',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'}),/Biology Teacher/);
});

test('long artwork wording uses a meaningful excerpt in Title and stays complete in Bullet 1',async()=>{
  const c=runtime(true),draft=fixture();
  const artwork='I MAY LOOK CALM BUT IN MY HEAD I HAVE SOLVED THE WHOLE SCIENCE PROBLEM TWICE';
  draft.analysis.artworkText=artwork;draft.analysis.textConfidence='clear';
  draft.bullet1=`${artwork} A science classroom joke uses a calm statement and a problem-solving twist.`;
  const intel=intelligenceFixture(draft);
  intel.visibleText={text:artwork,titleTextEnglish:artwork,confidence:'clear'};
  intel.titlePhrase='I MAY LOOK CALM';
  intel.relevantSellerKeywords=[{label:'Science Teacher',confidence:.9,evidence:['e1']}];
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingAttempt({extraKeywords:'Biology Teacher, Science Teacher',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert(result.title.startsWith('Science Teacher'),result.title);
  assert.match(result.title,/I May Look Calm/i);
  assert(!result.title.includes('Solved the Whole Science Problem'));
  assert(result.title.length<=60);
  assert(result.bullet1.startsWith(artwork));
});

test('generated Bullet 1 preserves the full artwork phrase first and niche SEO phrases last',async()=>{
  const c=runtime(true),draft=fixture(),artwork="I MAY LOOK CALM BUT IN MY HEAD I'VE SLAPPED YOU 3 TIMES";
  draft.analysis.artworkText=artwork;draft.analysis.textConfidence='clear';draft.keywords.push('Maine Coon feline');
  const intel=intelligenceFixture(draft);intel.visibleText={text:artwork,titleTextEnglish:artwork,confidence:'clear'};intel.titlePhrase='I May Look Calm';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingAttempt({sourceName:'Maine_Coon.png',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',merchListingPrefs:{language:'English (US)'}});
  const full=c.MerchProPrompt.cleanListingText(artwork),bullet=c.MerchProPrompt.cleanListingText(result.bullet1);
  assert.equal(bullet.slice(0,full.length).toLowerCase(),full.toLowerCase());
  const seoEnd=c.MerchProPrompt.cleanListingText(result.bullet1SEOKeywords.join(' '));
  assert(seoEnd);assert(bullet.toLowerCase().endsWith(seoEnd.toLowerCase()));
  assert(result.bullet1SEOKeywords.every(term=>term.toLowerCase().includes('maine coon')));
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

test('Costume written on artwork survives in Title and complete Bullet 1 wording', async () => {
  const c=runtime(true), draft=fixture();
  draft.analysis.artworkText='Cat Costume';draft.analysis.textConfidence='clear';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intelligenceFixture(draft):draft);
  const result=await c.generateListingAttempt({imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',merchListingPrefs:{language:'English (US)'}});
  assert(result.title.includes('Costume'));
  assert(result.bullet1.toLowerCase().startsWith('cat costume'));
  assert.equal(result.description,c.MerchProPrompt.descriptionFromBullets(result.bullet1,result.bullet2));
});

test('seller Costume keywords survive all listing fields without artwork lettering',async()=>{
  const c=runtime(true),draft=fixture();
  draft.brand='Maine Coon Costumes Apparel Co.';
  draft.bullet1='A Maine Coon Christmas cat costume features a red Santa hat, colorful lights, holly leaves and red berries.';
  draft.bullet2='Women, grandma, mom and girls who love cat costumes connect with this Maine Coon Christmas scene of lights and snowflakes.';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intelligenceFixture(draft):draft);
  const result=await c.generateListingFresh({extraKeywords:'Maine Coon costume',imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  for(const field of ['title','brand','bullet1','bullet2','description'])assert.match(result[field],/\bcostumes?\b/i,field);
  assert(result.keywords.some(term=>/\bcostumes?\b/i.test(term)));
  assert.equal(result.analysis.textConfidence,'none');
  assert.equal(result.description,c.MerchProPrompt.descriptionFromBullets(result.bullet1,result.bullet2));
});

test('Costume permission does not preserve other product types in bullet copy',async()=>{
  const c=runtime(true),draft=fixture();
  draft.bullet1='A Maine Coon Christmas cat costume shirt features a red Santa hat, colorful lights, holly leaves and red berries.';
  draft.bullet2='Women, grandma, mom and girls who love cat costumes and shirts connect with this Maine Coon Christmas scene of lights and snowflakes.';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intelligenceFixture(draft):draft);
  const result=await c.generateListingFresh({imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  for(const field of ['bullet1','bullet2']){assert.match(result[field],/\bcostumes?\b/i);assert.doesNotMatch(result[field],/\bshirts?\b/i);}
});

test('removes unsupported style wording such as Cute before validation',async()=>{
  const c=runtime(true),draft=fixture();draft.bullet1='A cute Maine Coon Christmas cat features a red Santa hat, colorful lights, holly leaves and red berries.';draft.keywords.push('Cute cat');
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intelligenceFixture(draft):draft);
  const result=await c.generateListingAttempt({imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',merchListingPrefs:{language:'English (US)'}});
  assert(!/\bcute\b/i.test([result.title,result.brand,result.bullet1,result.bullet2,...result.keywords].join(' ')));
});

test('short Bullet 1 is completed from image evidence without another AI request',async()=>{
  const c=runtime(true),draft=fixture();let imageCalls=0,copyCalls=0;
  draft.analysis.artworkText='Happy Holidays';draft.analysis.textConfidence='clear';
  draft.bullet1='Happy Holidays Maine Coon cat';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')){imageCalls++;return JSON.stringify(intelligenceFixture(draft));}
    copyCalls++;return JSON.stringify(draft);
  };
  const result=await c.generateListingFresh({imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(imageCalls,1);assert.equal(copyCalls,1);
  assert(result.bullet1.length>=75&&result.bullet1.length<=255);
  assert(result.bullet1.startsWith('Happy Holidays'));
  assert.match(result.bullet1,/Santa hat and Christmas lights/);
  assert(result.bullet1.endsWith(result.bullet1SEOKeywords.join(', ')));
  assert.equal(result.description,c.MerchProPrompt.descriptionFromBullets(result.bullet1,result.bullet2));
});

test('Bullet 1 removed by copy cleanup is recovered with safe image evidence',async()=>{
  const c=runtime(true),draft=fixture(),intel=intelligenceFixture(draft);let copyCalls=0;
  draft.bullet1='Perfect for Christmas parties and family gatherings.';
  intel.evidence[0].detail='Maine Coon cat wearing a red Santa hat with holly leaves and Christmas lights on a white background';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS'))return JSON.stringify(intel);
    copyCalls++;return JSON.stringify(draft);
  };
  const result=await c.generateListingFresh({imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(copyCalls,1);assert(result.bullet1.length>=75&&result.bullet1.length<=255);
  assert.doesNotMatch(result.bullet1,/perfect for|parties|gatherings|background/i);
  assert.match(result.bullet1,/Santa hat/);
});

test('overlong one-sentence Bullet 1 retains its body before final fitting',async()=>{
  const c=runtime(true),draft=fixture();let copyCalls=0;
  draft.analysis.artworkText='Happy Holidays';draft.analysis.textConfidence='clear';
  draft.bullet1='Happy Holidays '+('Maine Coon cat with a red Santa hat and colorful lights ').repeat(6);
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS'))return JSON.stringify(intelligenceFixture(draft));
    copyCalls++;return JSON.stringify(draft);
  };
  const result=await c.generateListingFresh({imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(copyCalls,1);assert(result.bullet1.length>=75&&result.bullet1.length<=255);
  assert(result.bullet1.startsWith('Happy Holidays'));assert.match(result.bullet1,/red Santa hat/);
});

test('field repair reuses visual analysis rather than making another image call', async()=>{
  const c=runtime(true),draft=fixture();let imageCalls=0,copyCalls=0;
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')){imageCalls++;assert(image);const intel=intelligenceFixture(draft);intel.evidence[0].detail='Maine Coon';return JSON.stringify(intel);}
    copyCalls++;assert.equal(image,null);
    return JSON.stringify(copyCalls===1?{...draft,bullet1:'Too short.'}:{bullet1:draft.bullet1});
  };
  const result=await c.generateListingFresh({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only',merchListingPrefs:{language:'English (US)'}});
  assert.equal(imageCalls,1);assert.equal(copyCalls,2);assert.equal(result.bullet1,c.MerchProPrompt.cleanListingText(draft.bullet1+' Maine Coon'));
});

for(const scenario of [
  {notes:'women',terms:['women','grandma','mom','girls'],opposite:/\b(?:men|boys|dad|grandpa)\b/i},
  {notes:'men',terms:['men','boys','kids','grandpa','dad'],opposite:/\b(?:women|girls|mom|grandma)\b/i},
  {notes:'women and men',terms:['women','grandma','mom','girls','men','boys','kids','grandpa','dad']}
])test(`missing Bullet 2 audience for ${scenario.notes} is repaired locally`,async()=>{
  const c=runtime(true),draft=fixture();let copyCalls=0;
  if(scenario.notes==='men')draft.bullet1=draft.bullet1.replace('for women','for men');
  draft.bullet2='A Maine Coon cat wears a red Santa hat with colorful Christmas lights, festive holly and red berries.';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS'))return JSON.stringify(intelligenceFixture(draft));
    copyCalls++;return JSON.stringify(draft);
  };
  const result=await c.generateListingFresh({extraKeywords:scenario.notes,imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(copyCalls,1);assert(result.bullet2.length>=75&&result.bullet2.length<=255);
  for(const term of scenario.terms)assert.match(result.bullet2,new RegExp(`\\b${term}\\b`,'i'));
  if(scenario.opposite)assert.doesNotMatch(result.bullet2,scenario.opposite);
  assert.match(result.bullet2,/Maine Coon cat/);
  assert.equal(result.description,c.MerchProPrompt.descriptionFromBullets(result.bullet1,result.bullet2));
});

test('partial Bullet 2 audience adds only missing roles without repeating existing ones',async()=>{
  const c=runtime(true),draft=fixture();
  draft.bullet2='Women and mom who love cats appreciate the Maine Coon Christmas scene with a red Santa hat and holly.';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intelligenceFixture(draft):draft);
  const result=await c.generateListingFresh({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  for(const term of ['women','mom','girls','grandma'])assert.equal((result.bullet2.match(new RegExp(`\\b${term}\\b`,'gi'))||[]).length,1,term);
  assert.match(result.bullet2,/Maine Coon Christmas/);
});

test('a full Bullet 2 uses a grounded fallback when all required roles need room',async()=>{
  const c=runtime(true),draft=fixture();let copyCalls=0;
  draft.bullet2=('A Maine Coon cat wears a red Santa hat with colorful Christmas lights and holly leaves ').repeat(3).trim();
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS'))return JSON.stringify(intelligenceFixture(draft));
    copyCalls++;return JSON.stringify(draft);
  };
  const result=await c.generateListingFresh({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(copyCalls,1);assert(result.bullet2.length>=75&&result.bullet2.length<=255);
  for(const term of ['women','grandma','mom','girls'])assert.match(result.bullet2,new RegExp(`\\b${term}\\b`,'i'));
  assert.match(result.bullet2,/Maine Coon/);assert.doesNotMatch(result.bullet2,/\b(?:men|boys|dad|grandpa)\b/i);
});

test('short Bullet 2 gains visible design detail and stays within 75 to 255 characters',async()=>{
  const c=runtime(true),draft=fixture();let copyCalls=0;
  draft.bullet2='A Maine Coon Christmas cat appears for women and girls.';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>{
    if(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS'))return JSON.stringify(intelligenceFixture(draft));
    copyCalls++;return JSON.stringify(draft);
  };
  const result=await c.generateListingFresh({imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert.equal(copyCalls,1);
  assert(result.bullet2.length>=75&&result.bullet2.length<=255);
  assert.match(result.bullet2,/Santa hat and Christmas lights/);
  assert.match(result.bullet2,/women/i);
  assert.equal(result.description,c.MerchProPrompt.descriptionFromBullets(result.bullet1,result.bullet2));
});

test('Bullet 2 length fitting keeps required audience and never exceeds 255',()=>{
  const c=runtime();
  const output=c.MerchListingOptimizer.bullet2({body:'A Maine Coon cat wears a Santa hat and Christmas lights. '.repeat(5),requiredTerms:['women','girls','mom','grandma'],fallback:'A Maine Coon Christmas cat with a Santa hat and lights appears in this design for women and girls including mom and grandma.',details:['Maine Coon cat wearing a Santa hat and Christmas lights'],min:75,max:255});
  assert(output.length>=75&&output.length<=255);
  for(const term of ['women','girls','mom','grandma'])assert.match(output,new RegExp(`\\b${term}\\b`,'i'));
});

test('Bullet 2 leaves an unsupported short draft for AI repair',()=>{
  const c=runtime();
  const output=c.MerchListingOptimizer.bullet2({body:'A small cat.',fallback:'This artwork is for women and men with a small cat design.',details:[],min:75,max:255});
  assert.equal(output,'A small cat.');
});

test('audience errors do not report a valid character count as a length failure',async()=>{
  const c=runtime(true),draft=fixture();
  draft.bullet1='A Maine Coon Christmas cat has a red Santa hat, holly leaves and colorful Christmas lights.';
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intelligenceFixture(draft):draft);
  await assert.rejects(c.generateListingAttempt({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},'',{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'}),error=>{
    assert.match(error.message,/Bullet 1: missing seller audience terms: women/);
    assert.doesNotMatch(error.message,/characters; allowed/);return true;
  });
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
  const intel=intelligenceFixture(draft);intel.visibleText.titleTextEnglish='Cute Cat';intel.styles=[{label:'Cute',confidence:.9,evidence:['e1']}];
  c.requestOpenAIWithBackup=async(model,key,backup,image,prompt)=>JSON.stringify(prompt.startsWith('DESIGN_INTELLIGENCE_ANALYSIS')?intel:draft);
  const result=await c.generateListingFresh({extraKeywords:'women',imageInlineData:{data:'test',mime_type:'image/png'}},{aiProvider:'openai',aiModel:'test-vision',openaiApiKey:'test-only'});
  assert(result.title.includes('Cute Cat'));assert(result.title.length<=60);assert(!c.MerchDesignIntelligence.hasNonLatinLetters(result.title));
  assert(result.bullet1.startsWith('Cute Cat'));
  assert.equal(result.analysis.artworkText,'かわいい猫');
});
