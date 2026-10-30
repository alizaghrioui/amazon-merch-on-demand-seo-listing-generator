const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function runtime(background = false) {
  const c = {AbortController,AbortSignal,setTimeout,clearTimeout,structuredClone,TextDecoder,TextEncoder,URL,crypto:require('node:crypto').webcrypto,
    chrome:{runtime:{onInstalled:{addListener(){}},onMessage:{addListener(){}}}}};
  vm.createContext(c);
  c.importScripts = (...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),c,{filename:file}));
  c.importScripts(...(background ? ['background.js'] : ['holiday-taxonomy.js','design-intelligence.js']));
  return c;
}
function raw(subject, detail, {text='',notes='',ids=[],styles=[],generic=false,animal='none'} = {}) {
  const evidence=[{id:'visual',source:'image',detail}];
  if(text)evidence.push({id:'text',source:'text',detail:text});
  if(notes)evidence.push({id:'seller',source:'seller',detail:notes});
  const claim=label=>({label,confidence:.9,evidence:['visual']});
  return {schemaVersion:1,blocked:false,evidence,subject:claim(subject),visibleText:{text,titleTextEnglish:text,confidence:text?'clear':'none'},mainTheme:claim(subject),secondaryThemes:[],interpretation:'',styles:styles.map(claim),genericSymbolsOnly:generic,animalTreatment:animal,
    occasions:ids.map(([id,label,relation='direct'])=>({...claim(label),id,relation})),
    audiences:[{...claim('women and men'),kind:'wearer',gender:'unisex'}],familyMatching:[],uncertainties:[]};
}

// These are explicit simulated model responses, not claimed image-recognition results.
const cases = [
  ['Santa Christmas',raw('Santa Claus','Santa Claus with red hat and Christmas tree',{ids:[['christmas','Christmas'],['christmas-eve','Christmas Eve']]}),['christmas']],
  ['Christmas mom audience',raw('Santa hat','Santa hat and Mom wording',{text:'Christmas Mom',ids:[['christmas','Christmas']]}),['christmas']],
  ['Halloween pumpkin',raw('Jack-o-lantern','Jack-o-lantern with ghost and Halloween wording',{ids:[['halloween','Halloween']]}),['halloween']],
  ['Valentine romantic heart',raw('Heart','Heart with Valentine love message',{text:'Be My Valentine',ids:[['valentines',"Valentine's Day"]]}),['valentines']],
  ['Easter bunny and spring',raw('Easter bunny','Easter bunny with decorated eggs and spring flowers',{ids:[['easter','Easter'],['spring','Spring','seasonal']]}),['easter','spring']],
  ["Mother's Day",raw('Flowers',"Flowers spelling Mother's Day",{ids:[['mothers-day',"Mother's Day"]]}),['mothers-day']],
  ["Father's Day",raw('Fishing dad',"Father's Day wording with fishing rod",{ids:[['fathers-day',"Father's Day"]]}),['fathers-day']],
  ['St Patrick shamrock',raw('Shamrock','Shamrock with St Patrick celebration wording',{ids:[['st-patricks',"St. Patrick's Day"]]}),['st-patricks']],
  ['Thanksgiving autumn',raw('Turkey','Turkey at Thanksgiving feast with autumn leaves',{ids:[['thanksgiving-us','Thanksgiving'],['autumn','Autumn','seasonal']]}),['thanksgiving-us','autumn']],
  ['Ramadan and specific Eid',raw('Lanterns','Ramadan and Eid al-Fitr words with crescent lanterns',{ids:[['ramadan','Ramadan'],['eid-fitr','Eid al-Fitr'],['eid-adha','Eid al-Adha']]}),['ramadan','eid-fitr']],
  ['Lunar New Year',raw('Dragon','Dragon with Lunar New Year celebration wording',{ids:[['lunar-new-year','Lunar New Year']]}),['lunar-new-year']],
  ['Diwali',raw('Diyas','Diwali wording with lit diyas',{ids:[['diwali','Diwali']]}),['diwali']],
  ['Vintage and Groovy',raw('Flowers','Groovy wavy shapes with evidenced vintage lettering',{styles:['Vintage','Groovy']}),[]],
  ['Leopard animal is not print',raw('Leopard','Single leopard animal sitting',{animal:'subject',styles:['Leopard Print']}),[]],
  ['Leopard pattern',raw('Leopard pattern','Repeated leopard spots across decorative motif',{animal:'pattern',styles:['Leopard Print']}),[]],
  ['Generic heart has no forced holiday',raw('Heart','Single plain heart',{generic:true,ids:[['valentines',"Valentine's Day"],['mothers-day',"Mother's Day"]]}),[]],
  ['Text stays exact; typography internal',raw('Rose','Rose with scripted name',{text:'ADLEY',styles:['Typography']}),[]]
];
for(const [name,input,expected] of cases)test(`evidence classification: ${name}`,()=>{
  const c=runtime(),value=c.MerchDesignIntelligence.normalize(input);
  assert.equal(value.occasions.map(item=>item.id).join(','),expected.join(','));
  assert.equal(value.visibleText.text,input.visibleText.text);
  if(name==='Leopard animal is not print')assert.equal(value.styles.length,0);
  if(name==='Leopard pattern')assert.equal(value.styles[0].label,'Leopard Print');
  if(name==='Vintage and Groovy')assert.equal(value.styles.map(item=>item.label).join(','),'Vintage,Groovy');
});

test('filename niche is retained only when it matches filename words and has image evidence',()=>{
  const c=runtime();const data=raw('Frog','Funny frog illustration');
  data.evidence.push({id:'file',source:'seller',detail:'Funny Sarcastic Frog'});
  data.filenameNiche={label:'Funny Sarcastic Frog',confidence:.9,evidence:['visual','file']};
  const accepted=c.MerchDesignIntelligence.normalize(data,{filename:'Funny-Sarcastic-Frog.png'});
  assert.equal(accepted.filenameNiche.label,'Funny Sarcastic Frog');
  const unsupported=c.MerchDesignIntelligence.normalize({...data,filenameNiche:{label:'Vintage Fishing',confidence:.9,evidence:['visual','file']}},{filename:'Funny-Sarcastic-Frog.png'});
  assert.equal(unsupported.filenameNiche,null);
});

test('humorous drafts get Funny appended locally without mistaking playful for humor',()=>{
  const c=runtime(true);
  c.MerchProPrompt={cleanListingText:value=>String(value||'').trim()};
  assert.equal(c.ensureFunnyKeyword('Dear Santa My Dad Did It Christmas','playful holiday humor'), 'Dear Santa My Dad Did It Christmas Funny');
  assert.equal(c.ensureFunnyKeyword('Funny Cat Joke','funny'), 'Funny Cat Joke');
  assert.equal(c.ensureFunnyKeyword('Cute British Shorthair Cat','cute and playful'), 'Cute British Shorthair Cat');
  assert.equal(c.ensureFunnyKeyword('Elegant Floral Cat','serious, not funny'), 'Elegant Floral Cat');
  assert.equal(c.ensureCuteKeyword('British Shorthair Cat', [{label:'Cute'}]), 'British Shorthair Cat Cute');
  assert.equal(c.ensureCuteKeyword('British Shorthair Cat', []), 'British Shorthair Cat');
});

test('Santa alone cannot establish matching family; explicit family wording can',()=>{
  const c=runtime(),input=raw('Santa Claus','Santa Claus',{text:'Matching Family Christmas'});
  const match={label:'Matching family Christmas',confidence:.9,evidence:['visual'],count:null,gender:''};
  input.familyMatching=[match];assert.equal(c.MerchDesignIntelligence.normalize(input).familyMatching.length,0);
  input.familyMatching[0].evidence=['text'];assert.equal(c.MerchDesignIntelligence.normalize(input).familyMatching.length,1);
});

test('four depicted boys are not four sons; explicit seller matching group retains count',()=>{
  const c=runtime(),notes='matching family for four boys',input=raw('Four boys','Four boys depicted in Halloween costumes',{notes});
  input.audiences=[{label:'Four boys',kind:'depicted',gender:'unknown',confidence:.9,evidence:['visual']},{label:'Four sons',kind:'wearer',gender:'men',confidence:.9,evidence:['visual']}];
  input.familyMatching=[{label:'Matching family for four boys',count:4,gender:'boys',confidence:.9,evidence:['visual']}];
  let v=c.MerchDesignIntelligence.normalize(input,{notes});assert.equal(v.audiences.length,1);assert.equal(v.familyMatching.length,0);
  input.familyMatching[0].evidence=['seller'];v=c.MerchDesignIntelligence.normalize(input,{notes});assert.equal(v.familyMatching[0].count,4);
  input.familyMatching[0].count=3;assert.equal(c.MerchDesignIntelligence.normalize(input,{notes}).familyMatching.length,0);
});

test('rejects malformed, missing, weak and fabricated seller evidence safely',()=>{
  const c=runtime();assert.throws(()=>c.MerchDesignIntelligence.parse('{"broken":'),/malformed/);
  assert.throws(()=>c.MerchDesignIntelligence.normalize({}),/structured/);
  const input=raw('Flower','Visible flower');input.subject.confidence=1.2;
  assert.throws(()=>c.MerchDesignIntelligence.normalize(input),/evidenced main subject/);
  input.subject.confidence=.9;input.evidence.push({id:'fake',source:'seller',detail:'Christmas'});
  input.occasions=[{id:'christmas',label:'Christmas',relation:'seller',confidence:.9,evidence:['fake']}];
  assert.equal(c.MerchDesignIntelligence.normalize(input,{notes:'women'}).occasions.length,0);
});

test('seller occasion is retained as seller context, never as invented visual evidence',()=>{
  const c=runtime(),input=raw('Flower','Plain flower',{notes:'Christmas women',generic:true});
  input.occasions=[{id:'christmas',label:'Christmas',relation:'seller',confidence:.9,evidence:['seller']}];
  const v=c.MerchDesignIntelligence.normalize(input,{notes:'Christmas women'});
  assert.equal(v.occasions[0].relation,'seller');assert(!v.evidence.some(e=>e.source==='image'&&e.detail.includes('Christmas')));
});

test('specific occasions can be established by exact non-English artwork text',()=>{
  const c=runtime();
  for(const [text,id,label] of [['عيد الفطر','eid-fitr','Eid al-Fitr'],['Fête des Mères','mothers-day','Fête des Mères']]){
    const input=raw('Flowers','Flowers',{text});input.visibleText.titleTextEnglish=id==='eid-fitr'?'Eid al-Fitr':"Mother's Day";input.occasions=[{id,label,relation:'direct',confidence:.9,evidence:['text']}];
    assert.equal(c.MerchDesignIntelligence.normalize(input).occasions[0].id,id);
  }
});

test('foreign artwork text is retained internally with a separate English title translation',()=>{
  const c=runtime(),input=raw('Cat','Cat',{text:'かわいい猫'});
  assert.throws(()=>c.MerchDesignIntelligence.normalize(input),/English translation/);
  input.visibleText.titleTextEnglish='Cute Cat';
  const value=c.MerchDesignIntelligence.normalize(input);
  assert.equal(value.visibleText.text,'かわいい猫');assert.equal(value.visibleText.titleTextEnglish,'Cute Cat');
  assert.equal(c.MerchDesignIntelligence.hasNonLatinLetters('Cute Cat'),false);
  assert.equal(c.MerchDesignIntelligence.hasNonLatinLetters('Cute 猫'),true);
  input.visibleText.titleTextEnglish='Cute 猫';assert.throws(()=>c.MerchDesignIntelligence.normalize(input),/English translation/);
});

test('market qualifiers stay in occasion metadata but are removed from title occasion labels',()=>{
  const c=runtime();
  assert.equal(c.MerchDesignIntelligence.titleOccasionLabel('Thanksgiving (US)'), 'Thanksgiving');
  assert.equal(c.MerchDesignIntelligence.titleOccasionLabel('Thanksgiving (Canada)'), 'Thanksgiving');
  assert.equal(c.MerchDesignIntelligence.titleOccasionLabel('Mother\'s Day'), 'Mother\'s Day');
});

test('empty second bullet fallback stays grounded and includes required audience terms',()=>{
  const c=runtime(),analysis={subject:{label:'Turkey'},mainTheme:{label:'Autumn harvest'},occasions:[{label:'Thanksgiving (US)',relation:'direct'}]};
  const unisex=c.MerchDesignIntelligence.fallbackBullet2(analysis,'unisex');
  assert.match(unisex,/Thanksgiving/);assert.match(unisex,/Turkey/);assert.match(unisex,/women and men/);assert(unisex.length>=75&&unisex.length<=255);
  const women=c.MerchDesignIntelligence.fallbackBullet2(analysis,'women',['women','grandma','mom','girls']);
  for(const term of ['women','grandma','mom','girls'])assert.match(women,new RegExp(`\\b${term}\\b`));
  assert(women.length>=75&&women.length<=255);
});

test('taxonomy covers every month and movable dates remain absent',()=>{
  const c=runtime(),all=c.MerchOccasions.entries;
  for(let month=1;month<=12;month++)assert(all.some(item=>item.months.includes(month)));
  for(const id of ['easter','ramadan','eid-fitr','eid-adha','lunar-new-year','diwali','holi','passover','rosh-hashanah','yom-kippur','mardi-gras','mothers-day','fathers-day']){
    const row=all.find(item=>item.id===id);assert(row.movable);assert.equal(row.exactDate,null);
  }
  assert(all.find(item=>item.id==='super-bowl').ipSensitive);
});

test('copy gate rejects unsupported holidays, styles and matching claims, including SEO keywords',()=>{
  const c=runtime(),analysis=c.MerchDesignIntelligence.normalize(raw('Cat','Plain cat'));
  const issues=c.MerchDesignIntelligence.listingIssues({title:'Retro Christmas Cat',bullet1:'Matching family design',keywords:['Diwali cat']},analysis);
  assert(issues.some(value=>value.includes('Christmas')));assert(issues.some(value=>value.includes('Diwali')));
  assert(issues.some(value=>value.includes('Retro')));assert(issues.some(value=>value.includes('Matching-family')));
});

test('funny and sarcastic tone may be supported by phrase interpretation, not only visual styles',()=>{
  const c=runtime(),analysis=c.MerchDesignIntelligence.normalize(raw('Turkey','Turkey with autumn leaves'));
  analysis.interpretation='Playful slang and a humorous pun about Thanksgiving';
  assert(!c.MerchDesignIntelligence.listingIssues({title:'Funny Turkey',keywords:['funny turkey']},analysis).some(item=>item.includes('Funny')));
  analysis.interpretation='Sarcastic wordplay with an ironic statement';
  assert(!c.MerchDesignIntelligence.listingIssues({title:'Sarcastic Turkey'},analysis).some(item=>item.includes('Sarcastic')));
  analysis.interpretation='Plain turkey with leaves';
  assert(c.MerchDesignIntelligence.listingIssues({title:'Funny Turkey'},analysis).some(item=>item.includes('Tone requires semantic evidence')));
  assert(c.MerchDesignIntelligence.listingIssues({title:'Retro Turkey'},analysis).some(item=>item.includes('Style requires visual evidence')));
});

test('Gemini stream sends artwork only in analysis, uses same configured model and no OpenAI key',async()=>{
  const c=runtime(true),calls=[];
  c.fetch=async(url,options)=>{
    const body=JSON.parse(options.body);calls.push({url,body});
    const content=calls.length===1?JSON.stringify(raw('Flower','Single flower')):JSON.stringify({title:'Flower'});
    const bytes=new TextEncoder().encode('data: '+JSON.stringify({candidates:[{content:{parts:[{text:content}]},finishReason:'STOP'}]})+'\n\n');
    let done=false;return {ok:true,body:{getReader:()=>({read:async()=>done?{done:true}:(done=true,{value:bytes,done:false})})}};
  };
  const image={mime_type:'image/png',data:'original-artwork-base64'};
  const text=await c.requestGeminiStream('gemini-test-vision','test-key',image,c.MerchDesignIntelligence.buildPrompt());
  const analysis=c.MerchDesignIntelligence.normalize(c.MerchDesignIntelligence.parse(text));
  await c.requestGeminiStream('gemini-test-vision','test-key',null,c.MerchDesignIntelligence.stage2(analysis));
  assert.equal(calls.length,2);assert(calls.every(call=>call.url.includes('gemini-test-vision')));
  assert.equal(calls[0].body.contents[0].parts[0].inline_data.data,image.data);
  assert(!calls[1].body.contents[0].parts.some(part=>part.inline_data));
  assert.equal(calls[0].body.generationConfig.maxOutputTokens,4096);
});

test('Gemini incomplete response never reaches listing parsing',async()=>{
  const c=runtime(true);c.fetch=async()=>{
    let done=false;const bytes=new TextEncoder().encode('data: '+JSON.stringify({candidates:[{content:{parts:[{text:'{"schemaVersion":1'}]},finishReason:'MAX_TOKENS'}]})+'\n');
    return {ok:true,body:{getReader:()=>({read:async()=>done?{done:true}:(done=true,{done:false,value:bytes})})}};
  };
  await assert.rejects(c.requestGeminiStream('gemini-test','key',{data:'image',mime_type:'image/png'},'DESIGN_INTELLIGENCE_ANALYSIS_V1'),/output limit/);
});
