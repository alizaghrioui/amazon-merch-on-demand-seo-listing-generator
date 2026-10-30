(function (root) {
  const VERSION = "1.0";
  const fields = ["title", "brand", "bullet1", "bullet2"];
  const stop = new Set("a an the and or for with of in on to is are this that design art artwork graphic featuring".split(" "));
  const normalize = value => String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  const tokens = value => normalize(value).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const content = value => tokens(value).filter(word => !stop.has(word));
  const contains = (copy, phrase) => {
    const words = tokens(copy), needle = tokens(phrase);
    return needle.length > 0 && words.some((_, i) => needle.every((word, j) => words[i + j] === word));
  };
  const instructions = `SEO ENGINE REVIEW: Keep the Keyword Planner schema and use its phrases to write accurate, readable copy. Before returning, check that the main subject remains clear, seller notes are expressed meaningfully, the supported or seller-supplied occasion is retained, and related keywords add different information across the two bullets. Avoid repeating the same long phrase in both bullets when a natural complementary detail is available. Never add unrelated trends or fill space with generic praise. Apply existing audience, content and length rules. No search-volume, competition, ranking or sales predictions are available. This review happens within the same AI request; do not return invented metrics.`;

  function classify(result, notes = "", isSafe = () => true) {
    const a = result.analysis || {}, plan = result.seoPlan || {};
    const sources = {
      subject: [a.mainNiche, a.subNiche,result.designIntelligence?.subject?.label],
      occasion: [...(a.eventStatus === "supported" ? [a.titleEvent, a.event] : []),...(result.designIntelligence?.occasions || []).map(item=>item.label)],
      visual: [a.titleTheme, a.themeElements, a.artworkText,...(result.designIntelligence?.styles || []).map(item=>item.label)],
      audience: [a.audience, a.audienceGender, "women girls mom mother grandma grandmother men boys kids dad father grandpa grandfather"],
      sellerContext: [notes]
    };
    const anchors = Object.fromEntries(Object.entries(sources).map(([key, values]) => [key, new Set(values.flatMap(content))]));
    const seen = new Set();
    return (Array.isArray(result.keywords) ? result.keywords : []).filter(term => typeof term === "string" && isSafe(term)).map(normalize).filter(term => {
      const key = tokens(term).join(" ");
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    }).map((term, order) => {
      const words = content(term);
      const categories = Object.keys(anchors).filter(key => words.some(word => anchors[key].has(word)));
      // Lexical evidence is not proof that the AI correctly read the image.
      const evidence = categories.filter(key => key !== "audience");
      return {term, categories:categories.length ? categories : ["needs-review"], evidence:evidence.length ? evidence : [], priority:normalize(term).toLocaleLowerCase() === normalize(plan.primary).toLocaleLowerCase() ? "primary" : (plan.longTail || []).some(value => normalize(value).toLocaleLowerCase() === term.toLocaleLowerCase()) ? "long-tail" : "secondary", usedIn:fields.filter(field => contains(result[field], term)), order};
    }).sort((a, b) => (b.priority === "primary") - (a.priority === "primary") || Boolean(b.evidence.length) - Boolean(a.evidence.length) || a.order - b.order).map(({order, ...entry}) => entry);
  }

  function optimize(result, prompt) {
    const listing = {...result};
    const changes = [];
    for (const field of fields) {
      const text = normalize(listing[field]);
      if (field.startsWith("bullet")) {
        const seen = new Set();
        listing[field] = text.split(/(?<=[.!?])\s+/u).filter(sentence => {
          const key = tokens(sentence).join(" ");
          if (seen.has(key)) { changes.push(`Removed a duplicate sentence in ${field}.`); return false; }
          seen.add(key); return true;
        }).join(" ");
      } else listing[field] = text;
    }
    listing.description = prompt.descriptionFromBullets(listing.bullet1, listing.bullet2);
    return {listing, changes};
  }

  function audit(result, {notes = "", excluded = [], prompt, changes = []} = {}) {
    const keywords = classify(result, notes, term => !prompt.copyIssues(term).length && !excluded.some(value => normalize(term).toLocaleLowerCase().includes(normalize(value).toLocaleLowerCase())));
    const issues = [];
    const add = (severity, code, field, message) => issues.push({severity, code, field, message});
    const limits = {title:[3,Number.MAX_SAFE_INTEGER],brand:[3,49],bullet1:[75,255],bullet2:[75,255],description:[75,1999]};
    for (const [field, [min,max]] of Object.entries(limits)) {
      if (typeof result[field] !== "string" || result[field].length < min || result[field].length > max) add("error", "length", field, `${field} must contain ${min}–${max} characters.`);
      const policy = prompt.copyIssues(result[field]);
      if (policy.length) add("error", "restricted-copy", field, policy.join("; "));
      if (excluded.some(value => normalize(value) && normalize(result[field]).toLocaleLowerCase().includes(normalize(value).toLocaleLowerCase()))) add("error", "excluded-term", field, "Contains a seller-excluded term.");
    }
    if (typeof result.title === "string" && result.title.length > 59) add("review", "title-over-amazon-limit", "title", `Title is ${result.title.length} characters; Amazon's limit is 59. It was kept intact so the seller can shorten it manually.`);
    if (result.description !== prompt.descriptionFromBullets(result.bullet1, result.bullet2)) add("error", "description", "description", "Description must equal both bullets joined by one space.");
    const artworkText=prompt.cleanListingText(result.designIntelligence?.visibleText?.text||"");
    if(artworkText&&prompt.cleanListingText(result.bullet1).slice(0,artworkText.length).toLocaleLowerCase()!==artworkText.toLocaleLowerCase())add("error","artwork-text-order","bullet1","Bullet 1 must begin with all readable original artwork words in order.");
    const seoEnding=prompt.cleanListingText((result.bullet1SEOKeywords||[]).join(" "));
    if(seoEnding&&!prompt.cleanListingText(result.bullet1).toLocaleLowerCase().endsWith(seoEnding.toLocaleLowerCase()))add("error","seo-keywords-ending","bullet1","Bullet 1 must end with its relevant niche SEO phrases.");
    for (const term of (Array.isArray(result.keywords) ? result.keywords : [])) {
      if (prompt.copyIssues(term).length) add("error", "restricted-copy", "keywords", `Restricted keyword: ${normalize(term)}.`);
      if (excluded.some(value => normalize(value) && normalize(term).toLocaleLowerCase().includes(normalize(value).toLocaleLowerCase()))) add("error", "excluded-term", "keywords", "Keyword contains a seller-excluded term.");
    }
    const primary = normalize(result.seoPlan?.primary);
    if (primary && !["title","bullet1","bullet2"].some(field => contains(result[field], primary))) add("review", "primary-coverage", "listing", "The planner's primary phrase is not present verbatim; review whether its meaning is expressed naturally.");
    for (const item of keywords) {
      if (!item.evidence.length) add("review", "keyword-evidence", "keywords", `Review relevance: ${item.term}. No lexical match to design analysis or seller context.`);
      if (tokens(item.term).length >= 3 && item.usedIn.includes("bullet1") && item.usedIn.includes("bullet2")) add("review", "repeated-phrase", "bullets", `Both bullets repeat “${item.term}”; consider complementary wording.`);
    }
    for (const field of ["title","bullet1","bullet2"]) {
      const counts = new Map();
      for (const word of content(result[field])) counts.set(word,(counts.get(word)||0)+1);
      if ([...counts.values()].some(count => count >= 4)) add("review", "repetition", field, "A content word appears four or more times; review unnecessary repetition.");
    }
    if (notes) add("info", "seller-context", "listing", "Seller notes informed the AI request; semantic accuracy needs human review.");
    if ([result.trademarkReport?.riskLevel,result.copyrightReport?.riskLevel].some(value => /^(MEDIUM|HIGH)$/.test(value || ""))) add("review", "ip-risk", "listing", "Review the preliminary IP reports before publishing.");
    return {version:VERSION,status:issues.some(item => item.severity === "error") ? "needs-correction" : issues.some(item => item.severity === "review") ? "review" : "checks-passed",keywords,issues,changes,checks:{lengths:!issues.some(item => item.code === "length"),restrictedCopy:!issues.some(item => item.code === "restricted-copy" || item.code === "excluded-term"),description:!issues.some(item => item.code === "description")},basis:"Local copy checks and AI design analysis; no live search-volume, competition, ranking or trademark data. No Amazon approval or ranking guarantee."};
  }
  root.MerchSEOEngine = {VERSION, instructions, classify, optimize, audit};
})(globalThis);
