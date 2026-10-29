(() => {
  if (!location.pathname.startsWith('/s')) return;
  const button=document.createElement('button'); button.textContent='Extract keywords';
  Object.assign(button.style,{position:'fixed',right:'18px',bottom:'22px',zIndex:'2147483647',padding:'12px 16px',border:'0',borderRadius:'999px',background:'#b91c3c',color:'#fff',font:'600 14px system-ui',boxShadow:'0 4px 18px #0003',cursor:'pointer'});
  button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Extracting…';
    try{const cards=[...document.querySelectorAll(AmazonSelectors.results)];const results=cards.map(card=>({asin:card.getAttribute('data-asin')||'',title:card.querySelector(AmazonSelectors.title)?.textContent?.trim()||''})).filter(x=>x.title);
      const counts=new Map(); for(const result of results) for(const item of KeywordTools.ngrams(result.title)) counts.set(item.phrase,(counts.get(item.phrase)||0)+item.count);
      const ranked=[...counts].map(([phrase,count])=>({phrase,count})).sort((a,b)=>b.count-a.count||a.phrase.localeCompare(b.phrase)); await chrome.runtime.sendMessage({type:'EXTRACT_VISIBLE',payload:{results,ranked,query:new URLSearchParams(location.search).get('k')||'',capturedAt:new Date().toISOString()}});button.textContent=`Sent ${ranked.length} phrases`;
    }catch(e){button.textContent='Extraction failed';} setTimeout(()=>{button.textContent='Extract keywords';button.disabled=false;},2500);
  }); document.documentElement.append(button);
})();
