(function(root){
  const compact=value=>String(value||"").normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  const words=value=>compact(value).split(/\s+/).filter(Boolean);
  const key=value=>String(value).toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
  function cleanCandidate(value){return compact(value).replace(/[?\-_*@\[\]{}]/g," ").replace(/\s+/g," ").trim();}
  function title({niche,phrase,event,theme,style,funny,max=60}){
    const base=words(cleanCandidate(niche));if(!base.length)return "";
    const out=[],seen=new Set();const add=value=>{
      const pending=[];for(const word of words(cleanCandidate(value))){const k=key(word);if(k&&!seen.has(k)&&!pending.some(item=>key(item)===k))pending.push(word);}
      if(pending.length&&`${out.join(" ")}${out.length?" ":""}${pending.join(" ")}`.length>max)return false;
      for(const word of pending){out.push(word);seen.add(key(word));}return true;
    };
    let basePhrase="";for(const word of base){const next=basePhrase?`${basePhrase} ${word}`:word;if(next.length>Math.min(45,max))break;basePhrase=next;}add(basePhrase);
    if(funny)add("Funny");
    const shortPhrase=words(cleanCandidate(phrase)).slice(0,4).join(" ");add(shortPhrase);
    add(event);add(theme);add(style);
    return out.join(" ");
  }
  const stop=new Set("a an and at by for from in of on the to with wearing featuring holding".split(" "));
  const modifiers=new Set("funny humorous humor sarcastic sarcasm cute playful witty silly goofy hilarious vintage retro groovy watercolor realistic cartoon floral botanical christmas halloween valentine".split(" "));
  function coreNiche({niche="",subject=""}={}){
    const head=value=>words(cleanCandidate(value).split(/\b(?:with|wearing|holding|featuring|standing|sitting|against|beside|and)\b/i)[0]).filter(word=>!stop.has(key(word))&&!modifiers.has(key(word)));
    const candidates=[head(niche),head(subject)].filter(list=>list.length).sort((a,b)=>a.length-b.length);
    return candidates[0]?.join(" ")||words(cleanCandidate(niche)).slice(-1).join("");
  }
  function brand({niche,subject="",brand="",title="",max=49}){
    const originalCore=coreNiche({niche,subject});if(!originalCore)return "Design Fans Apparel Co.";
    const suffix="Apparel Co.";
    const titleKeys=new Set(words(title).map(key));
    const candidates=words(cleanCandidate(brand)).filter(word=>!stop.has(key(word))&&!modifiers.has(key(word))&&!/^(?:gift|gifts|design|art|apparel|clothing|co)$/i.test(word));
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
  function bullet1({artworkText="",textEnglish="",confidence="none",body="",niche="",subject="",keywords=[],max=255}){
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
    for(const item of Array.isArray(keywords)?keywords:[]){
      const phrase=cleanCandidate(item), normalized=tokensOf(phrase).join(" ");
      if(!phrase||!normalized||seen.has(normalized)||alreadyThere(phrase,`${cleanedText} ${tail}`)||!tokensOf(phrase).some(token=>nicheKeys.has(token)))continue;
      seen.add(normalized);suffix.push(phrase);if(suffix.length>=3)break;
    }
    if(!suffix.length){
      const fallback=(Array.isArray(keywords)?keywords:[]).map(cleanCandidate).find(phrase=>phrase&&tokensOf(phrase).some(token=>nicheKeys.has(token)))||cleanCandidate(coreNiche({niche,subject}));
      if(fallback)suffix.push(fallback);
    }
    const prefix=text?cleanCandidate(text):"";
    let selected=suffix;
    const build=terms=>[prefix,tail,terms.length?terms.join(", "):""].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
    let result=build(selected);
    while(result.length>max&&selected.length){selected=selected.slice(0,-1);result=build(selected);}
    while(result.length>max&&tail){const sentences=tail.split(/(?<=[.!?])\s+/u);sentences.pop();tail=sentences.join(" ");result=build(selected);}
    if(suffix.length&&!selected.length)throw new Error("Bullet 1 cannot fit a niche SEO phrase after the complete artwork wording within 255 characters.");
    if(result.length>max||text&&!result.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()))throw new Error("Bullet 1 cannot preserve the complete artwork wording within 255 characters.");
    return {text:result,keywords:selected};
  }
  root.MerchListingOptimizer={title,brand,coreNiche,bullet1,cleanCandidate};
})(globalThis);
