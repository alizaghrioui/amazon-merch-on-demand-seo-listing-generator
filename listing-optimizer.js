(function(root){
  const compact=value=>String(value||"").normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  const words=value=>compact(value).split(/\s+/).filter(Boolean);
  const key=value=>String(value).toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
  function cleanCandidate(value){return compact(value).replace(/[\p{S}]+/gu," ").replace(/[?\-_*@\[\]{}]/g," ").replace(/\s+/g," ").trim();}
  function titleNiche({sellerNiche="",filenameNiche="",subject="",max=60}){
    const seller=(Array.isArray(sellerNiche)?sellerNiche:[sellerNiche]).map(cleanCandidate);
    const filename=cleanCandidate(filenameNiche), visualSubject=cleanCandidate(subject);
    // A filename can be a comma-free list of adjacent niche variants, such
    // as "Science Teacher Chemistry Teacher Biology Teacher". Prefer the
    // separately evidenced visual subject over that collection of audiences.
    const filenameWords=words(filename).map(key);
    const repeatedTeacher=filenameWords.filter(word=>word==="teacher").length>1;
    const candidates=[...seller,...(repeatedTeacher?[visualSubject,filename]:[filename,visualSubject])];
    const selected=candidates.find(value=>value&&value.length<=max);
    if(!selected)throw new Error(`The verified niche is too long for a ${max}-character Title. Use a shorter artwork filename or a clearer design image, then generate again.`);
    return selected;
  }
  function title({niche,phrase,event,theme,style,funny,keywords=[],suggested="",evidence="",max=60}){
    const base=cleanCandidate(niche);if(!base)return "";
    if(base.length>max)throw new Error(`The verified niche is too long for a ${max}-character Title.`);
    const out=words(base);const add=value=>{
      const seen=new Set(out.map(key));
      const pending=words(cleanCandidate(value)).filter(word=>!seen.has(key(word))&&!!key(word));
      if(!pending.length)return false;
      const existing=out.map(key),needle=pending.map(key);
      if(existing.some((_,index)=>needle.every((word,offset)=>existing[index+offset]===word)))return true;
      if(`${out.join(" ")} ${pending.join(" ")}`.length>max)return false;
      out.push(...pending);return true;
    };
    add(phrase);
    if(funny)add("Funny");
    add(event);
    // A secondary phrase is optional. Keep novel words such as "Costume"
    // without repeating the niche, but skip competing teacher specialties.
    const firstKeyword=(Array.isArray(keywords)?keywords:[]).find(value=>cleanCandidate(value));
    if(firstKeyword){
      const existing=new Set(out.map(key)),keywordWords=words(cleanCandidate(firstKeyword));
      if(!(key(keywordWords.at(-1))==="teacher"&&existing.has("teacher")))
        add(keywordWords.filter(word=>!existing.has(key(word))).join(" "));
    }
    add(theme);add(style);
    // The model's draft can contain useful visual descriptors that the short
    // structured theme missed. Admit only words backed by verified evidence.
    const supported=new Set(words(cleanCandidate(evidence)).map(key));
    const optional=words(cleanCandidate(suggested)).filter(word=>supported.has(key(word))&&!stop.has(key(word))&&!modifiers.has(key(word)));
    for(const word of optional.slice(0,5))add(word);
    return out.join(" ");
  }
  const stop=new Set("a an and at by for from in of on the to with wearing featuring holding".split(" "));
  const modifiers=new Set("funny humorous humor sarcastic sarcasm cute playful witty silly goofy hilarious vintage retro groovy watercolor realistic cartoon floral botanical christmas halloween valentine".split(" "));
  function coreNiche({niche="",subject=""}={}){
    const head=value=>words(cleanCandidate(value).split(/\b(?:with|wearing|holding|featuring|standing|sitting|against|beside|and)\b/i)[0]).filter(word=>!stop.has(key(word))&&!modifiers.has(key(word)));
    const candidates=[head(niche),head(subject)].filter(list=>list.length).sort((a,b)=>a.length-b.length);
    return candidates[0]?.join(" ")||words(cleanCandidate(niche)).slice(-1).join("");
  }
  function brand({niche,subject="",brand="",title="",keywords=[],max=49}){
    const originalCore=coreNiche({niche,subject});if(!originalCore)return "Design Fans Apparel Co.";
    const suffix="Apparel Co.";
    const titleKeys=new Set(words(title).map(key));
    const candidates=[...(Array.isArray(keywords)?keywords:[]).flatMap(value=>words(cleanCandidate(value))),...words(cleanCandidate(brand))].filter(word=>!stop.has(key(word))&&!modifiers.has(key(word))&&!/^(?:gift|gifts|design|art|apparel|clothing|co)$/i.test(word));
    const coreWords=words(originalCore);
    const extras=candidates.filter(word=>!coreWords.some(base=>key(base)===key(word))&&!titleKeys.has(key(word)));
    const fallbacks=["Lovers","Fans","Enthusiasts"].filter(word=>!titleKeys.has(key(word)));
    const complement=extras[0]||fallbacks[0]||"Fans";
    let fitted=[...coreWords];
    const compose=()=>`${fitted.join(" ")} ${complement} ${suffix}`.trim();
    let result=compose();
    if(result.length>max){
      while(result.length>max&&fitted.length>1){fitted.shift();result=compose();}
      if(result.length>max){
        const replacement=fallbacks.find(word=>!titleKeys.has(key(word))&&`${fitted.join(" ")} ${word} ${suffix}`.length<=max)||"Fans";
        result=`${fitted.join(" ")} ${replacement} ${suffix}`;
      }
    }
    if(result.length>max){const noun=coreWords.at(-1)||"Design";result=`${noun.slice(0,Math.max(1,max-suffix.length-8))} Fans ${suffix}`;}
    if(words(result).filter(word=>!/^APPAREL$|^CO\.$/i.test(word)).every(word=>titleKeys.has(key(word))))result=`${coreWords.at(-1)||"Design"} Fans ${suffix}`;
    result=result.toLocaleLowerCase().replace(/\b\p{L}/gu,letter=>letter.toLocaleUpperCase()).trim();
    if(!result.endsWith(suffix))result=`${coreWords.at(-1)||"Design"} Fans ${suffix}`;
    if(result.length>max){
      const fixed=`${coreWords.at(-1)||"Design"} Fans ${suffix}`;
      result=fixed.length<=max?fixed:`Design Fans ${suffix}`;
    }
    return result;
  }
  function bullet2({body="",requiredTerms=[],fallback="",details=[],min=75,max=255}){
    const copy=compact(body);
    const required=[...new Set(requiredTerms.map(value=>compact(value).toLocaleLowerCase()).filter(Boolean))];
    const contains=(value,term)=>words(cleanCandidate(value)).some(word=>key(word)===key(term));
    const missing=required.filter(term=>!contains(copy,term));
    const complete=value=>{
      if(value.length>=min)return value;
      const existing=new Set(words(cleanCandidate(value)).map(key));
      for(const raw of Array.isArray(details)?details:[]){
        const detail=cleanCandidate(raw);
        const novel=new Set(words(detail).map(key).filter(token=>token.length>2&&!stop.has(token)&&!existing.has(token)));
        if(!detail||novel.size<2)continue;
        const sentence=`The artwork shows ${detail.replace(/[.!?]+$/u,"")}.`;
        const joined=[value&&/[.!?]$/.test(value)?value:value?`${value}.`:"",sentence].filter(Boolean).join(" ");
        if(joined.length>max)continue;
        if(joined.length>=min)return joined;
      }
      const safeFallback=compact(fallback);
      if(required.length&&safeFallback.length>=min&&safeFallback.length<=max&&required.every(term=>contains(safeFallback,term)))return safeFallback;
      return value;
    };
    if(!missing.length)return complete(copy);
    const join=list=>list.length<2?list.join(""):list.length===2?list.join(" and "):`${list.slice(0,-1).join(", ")} and ${list.at(-1)}`;
    const audience=list=>{
      const set=new Set(list);
      if(list.length===4&&["women","girls","mom","grandma"].every(term=>set.has(term)))return "women and girls including mom and grandma";
      if(list.length===5&&["men","boys","kids","dad","grandpa"].every(term=>set.has(term)))return "men and boys including kids, dad and grandpa";
      if(list.length===9&&["women","girls","mom","grandma","men","boys","kids","dad","grandpa"].every(term=>set.has(term)))return "women, men, girls, boys and kids as well as mom, dad, grandma and grandpa";
      return join(list);
    };
    const addition=`This design is ${missing.length<required.length?"also ":""}for ${audience(missing)}.`;
    const combine=value=>[value&&!/[.!?]$/.test(value)?`${value}.`:value,addition].filter(Boolean).join(" ");
    if(combine(copy).length<=max)return complete(combine(copy));
    // Preserve complete existing sentences where they leave room for the
    // missing audience. Otherwise use the caller's evidence-based fallback.
    const sentences=copy.split(/(?<=[.!?])\s+/u).filter(Boolean);
    const selected=[];
    for(const sentence of sentences)if(combine([...selected,sentence].join(" ")).length<=max)selected.push(sentence);
    const fitted=combine(selected.join(" "));
    if(selected.length&&required.every(term=>contains(fitted,term)))return complete(fitted);
    const safeFallback=compact(fallback);
    if(safeFallback&&safeFallback.length<=max&&required.every(term=>contains(safeFallback,term)))return complete(safeFallback);
    // Keep the missing requirement visible to the existing AI field repair.
    return copy;
  }
  function bullet1({artworkText="",textEnglish="",confidence="none",body="",niche="",subject="",keywords=[],details=[],natural=false,min=75,max=255}){
    const text=compact(confidence==="clear"?(artworkText||textEnglish):"");
    const cleanedText=cleanCandidate(text);
    if(text&&cleanedText.length>max)throw new Error("Complete artwork wording exceeds Bullet 1's 255-character limit. Nothing was truncated.");
    const tokensOf=value=>words(cleanCandidate(value)).map(key).filter(Boolean);
    const phraseTokens=tokensOf(cleanedText);
    let tail=compact(body);
    const bodyTokens=tokensOf(tail);
    if(phraseTokens.length&&phraseTokens.every((token,index)=>bodyTokens[index]===token)){
      const matches=[...tail.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)];
      tail=matches[phraseTokens.length-1]?tail.slice(matches[phraseTokens.length-1].index+matches[phraseTokens.length-1][0].length):"";
    }else if(cleanedText&&tail.toLocaleLowerCase().includes(cleanedText.toLocaleLowerCase())){
      tail=tail.replace(new RegExp(cleanedText.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"ig")," ");
    }
    tail=cleanCandidate(tail);
    const nicheKeys=new Set(tokensOf(`${niche} ${subject}`).filter(token=>token.length>2));
    const alreadyThere=(phrase,source)=>{const needle=tokensOf(phrase),haystack=tokensOf(source);return needle.length>0&&haystack.some((_,index)=>needle.every((token,offset)=>haystack[index+offset]===token));};
    const suffix=[],seen=new Set();
    for(const item of natural?[]:Array.isArray(keywords)?keywords:[]){
      const phrase=cleanCandidate(item), normalized=tokensOf(phrase).join(" ");
      if(!phrase||!normalized||seen.has(normalized)||alreadyThere(phrase,`${cleanedText} ${tail}`)||!tokensOf(phrase).some(token=>nicheKeys.has(token)))continue;
      seen.add(normalized);suffix.push(phrase);if(suffix.length>=3)break;
    }
    if(!natural&&!suffix.length){
      const fallback=(Array.isArray(keywords)?keywords:[]).map(cleanCandidate).find(phrase=>phrase&&tokensOf(phrase).some(token=>nicheKeys.has(token)))||cleanCandidate(coreNiche({niche,subject}));
      if(fallback)suffix.push(fallback);
    }
    const prefix=text?cleanCandidate(text):"";
    const build=(body,terms)=>[prefix,body,terms.length?terms.join(", "):""].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
    const trimBodyToFit=(body,terms)=>{
      let fitted=body;
      while(build(fitted,terms).length>max&&fitted){
        const shorter=fitted.replace(/\s+\S+\s*$/u,"").trim();
        if(shorter===fitted)break;
        fitted=shorter;
      }
      return fitted;
    };
    let selected=suffix, fittedTail=trimBodyToFit(tail,selected);
    if(build(fittedTail,selected).length>max){
      selected=[];fittedTail=tail;
      for(let count=suffix.length-1;count>=1;count--){
        const terms=suffix.slice(0,count), body=trimBodyToFit(tail,terms);
        if(build(body,terms).length<=max){selected=terms;fittedTail=body;break;}
      }
    }
    tail=fittedTail;
    let result=build(tail,selected);
    // A model can return too little copy, or sanitation can remove most of it.
    // Add only caller-validated image evidence, before the SEO ending. Never
    // pad with repeated keywords or invent details to satisfy a length check.
    for(const detail of Array.isArray(details)?details:[]){
      if(result.length>=min)break;
      const candidate=cleanCandidate(detail);
      const existing=new Set(tokensOf(result));
      const novel=new Set(tokensOf(candidate).filter(token=>!stop.has(token)&&!existing.has(token)));
      if(!candidate||alreadyThere(candidate,result)||novel.size<2)continue;
      const extendedTail=[tail,candidate].filter(Boolean).join(" ");
      const extended=build(extendedTail,selected);
      if(extended.length>max)continue;
      tail=extendedTail;result=extended;
    }
    if(suffix.length&&!selected.length)throw new Error("Bullet 1 cannot fit a niche SEO phrase after the complete artwork wording within 255 characters.");
    if(result.length>max||text&&!result.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()))throw new Error("Bullet 1 cannot preserve the complete artwork wording within 255 characters.");
    return {text:result,keywords:selected};
  }
  root.MerchListingOptimizer={title,titleNiche,brand,coreNiche,bullet1,bullet2,cleanCandidate};
})(globalThis);
