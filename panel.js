const $ = (s) => document.querySelector(s);
function message(text, error = false) { $('#status').textContent=text; $('#status').className=error?'error':''; }
const providerNames={gemini:'Gemini',openai:'OpenAI',claude:'Claude'};
const keys = { gemini:'', openai:'', claude:'' }, backupKeys = { gemini:'', openai:'', claude:'' };
let catalogs = {}, provider='gemini', selectedModel='auto', loading = false, revision = 0;
function renderModels() {
  const select = $('#aiModel'); select.replaceChildren();
  const modelOptions=catalogs[provider]?.length?catalogs[provider]:MerchAI.defaults[provider].map(id=>({id,label:id}));
  const options=[{id:'auto',label:'Auto · Fast'},{id:'auto-pro',label:'Auto · Pro'},...modelOptions];
  if (selectedModel && !options.some(m=>m.id===selectedModel)) options.push({id:selectedModel,label:selectedModel});
  for(const model of options){const option=document.createElement('option');option.value=model.id;option.textContent=model.label;select.append(option);}
  select.value=selectedModel;
}
function showProvider() {
  $('#aiProvider').value=provider; $('#apiKey').value=keys[provider]; $('#apiKey2').value=backupKeys[provider];
  $('#apiKey').type='password'; $('#apiKey2').type='password'; $('#toggleKey').textContent='Show'; $('#toggleKey2').textContent='Show';
  const name=providerNames[provider]; $('#providerBadge').textContent=name.toUpperCase();
  const urls={gemini:'https://aistudio.google.com/apikey',openai:'https://platform.openai.com/api-keys',claude:'https://platform.claude.com/settings/keys'};
  $('#keyLink').href=urls[provider]; $('#keyLink').textContent=`Get your ${name} API key ↗`;
  $('#modelHint').textContent=selectedModel==='auto-pro'?`Auto Pro prioritizes quality using an available ${name} vision model.`:selectedModel==='auto'?`Auto Fast chooses a quick ${name} vision model for artwork analysis and listing generation.`:'This model will analyze the artwork and generate your listing.';
}
async function loadModels() {
  if(loading)return;const key=$('#apiKey').value.trim()||$('#apiKey2').value.trim();if(!key){message('Add a primary or backup API key first.',true);return;}
  const currentProvider=provider,stamp=revision;loading=true;$('#refreshModels').disabled=true;message('Loading available vision models…');
  try {const models=await MerchAI.list(currentProvider,key);if(!models.length)throw new Error('No compatible listing models were returned for this key.'); if(stamp!==revision || currentProvider!==provider || key!==($('#apiKey').value.trim()||$('#apiKey2').value.trim())) return;
    catalogs[currentProvider]=models; await chrome.storage.local.set({[`${currentProvider}ModelCatalog`]:models}); renderModels();message(`${models.length} available ${nameFor(currentProvider)} models loaded.`);
  }catch(error){if(stamp===revision)message(error.message,true);}finally{loading=false;$('#refreshModels').disabled=false;}
}
function nameFor(value){return providerNames[value]||value;}
$('#aiProvider').addEventListener('change',()=>{keys[provider]=$('#apiKey').value.trim();backupKeys[provider]=$('#apiKey2').value.trim();provider=$('#aiProvider').value;selectedModel='auto';revision++;renderModels();showProvider();message('');if(keys[provider]||backupKeys[provider])loadModels();});
$('#aiModel').addEventListener('change',()=>{keys[provider]=$('#apiKey').value.trim();backupKeys[provider]=$('#apiKey2').value.trim();selectedModel=$('#aiModel').value;revision++;showProvider();message('');});
$('#apiKey').addEventListener('input',()=>{keys[provider]=$('#apiKey').value.trim();revision++;message('');});
$('#apiKey2').addEventListener('input',()=>{backupKeys[provider]=$('#apiKey2').value.trim();revision++;message('');});
$('#toggleKey').addEventListener('click',()=>{const hidden=$('#apiKey').type==='password';$('#apiKey').type=hidden?'text':'password';$('#toggleKey').textContent=hidden?'Hide':'Show';});
$('#toggleKey2').addEventListener('click',()=>{const hidden=$('#apiKey2').type==='password';$('#apiKey2').type=hidden?'text':'password';$('#toggleKey2').textContent=hidden?'Hide':'Show';});
$('#refreshModels').addEventListener('click',loadModels);
$('#testApi').addEventListener('click',async()=>{
  keys[provider]=$('#apiKey').value.trim();backupKeys[provider]=$('#apiKey2').value.trim();
  const checks=[{provider,key:keys[provider],label:`${nameFor(provider)} primary`},{provider,key:backupKeys[provider],label:`${nameFor(provider)} backup`}].filter(item=>item.key);
  if(!checks.length){message('Add an API key, then save or test again.',true);return;}
  const button=$('#testApi');button.disabled=true;message('Testing API keys with a short request…');const results=[];
  for(const item of checks){
    const model=MerchAI.choose(item.provider,selectedModel,catalogs[item.provider]?.length?catalogs[item.provider]:MerchAI.defaults[item.provider]);
    try{const response=await chrome.runtime.sendMessage({type:'MERCH_PRO_TEST_API_KEY',provider:item.provider,model,key:item.key});results.push({ok:response?.ok,text:response?.ok?`${item.label}: working (${response.result.model})`:`${item.label}: ${response?.error||'test failed'}`});}
    catch(error){results.push({ok:false,text:`${item.label}: ${error.message||'test failed'}`});}
  }
  button.disabled=false;message(results.map(result=>result.text).join(' · '),results.some(result=>!result.ok));
});
$('#apiForm').addEventListener('submit',async event=>{
  event.preventDefault();const key=$('#apiKey').value.trim(),backup=$('#apiKey2').value.trim();if(!key&&!backup){message('Add a primary or backup API key first.',true);return;}
  $('#saveKey').disabled=true;
  try{keys[provider]=key;backupKeys[provider]=backup;await chrome.storage.local.set({aiProvider:provider,aiModel:selectedModel,[`${provider}ApiKey`]:key,[`${provider}ApiKey2`]:backup});message(backup?'AI settings saved. Backup key switches in when the primary reaches quota.':'AI settings saved.');await loadModels();}
  catch(_){message('Could not save settings. Try again.',true);}finally{$('#saveKey').disabled=false;}
});
(async()=>{try{const stored=await chrome.storage.local.get(['geminiApiKey','geminiApiKey2','openaiApiKey','openaiApiKey2','claudeApiKey','claudeApiKey2','aiProvider','aiModel','geminiModelCatalog','openaiModelCatalog','claudeModelCatalog']);await chrome.storage.local.remove(['codecraftApiKey','codecraftApiKey2','codecraftModelCatalog']);for(const p of Object.keys(providerNames)){keys[p]=stored[`${p}ApiKey`]||'';backupKeys[p]=stored[`${p}ApiKey2`]||'';}catalogs={gemini:stored.geminiModelCatalog,openai:stored.openaiModelCatalog,claude:stored.claudeModelCatalog};provider=providerNames[stored.aiProvider]?stored.aiProvider:'gemini';selectedModel=stored.aiModel||'auto';if(stored.aiProvider==='codecraft'){provider='gemini';selectedModel='auto';await chrome.storage.local.set({aiProvider:provider,aiModel:selectedModel});}renderModels();showProvider();$('#aiProvider').disabled=false;$('#aiModel').disabled=false;$('#saveKey').disabled=false;if(keys[provider]||backupKeys[provider])await loadModels();}catch(_){message('Could not load settings. Reopen the popup.',true);}})();
