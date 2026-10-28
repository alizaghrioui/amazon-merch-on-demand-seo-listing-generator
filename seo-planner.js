(function (root) {
  const instructions = `SEO KEYWORD PLANNER (perform before writing, in this same response):
FINAL COPY PRIORITY: Never put Typography, Typographic, Cartoon or Cartoony in any listing field or keyword. Keep these observations only in internal analysis. Do not require or append visual style labels in Title. Use the space for subject, meaningful seller context, specific event and audience instead. Explicit women/female notes mean women-focused copy: include Women naturally in Title and women in BOTH bullets; include grandma, mom, girls naturally in Bullet 2. Do not add men, boys, dad or grandpa for women-only notes. Explicit men/male notes mean Men in Title and men in BOTH bullets, plus boys, kids, grandpa, dad in Bullet 2; do not add women/girls/mom/grandma. Both explicit genders mean mixed audience. THIS overrides any earlier universal audience list, mandatory style label or instruction against audience in Title. Seller notes are mandatory context to express naturally, not a literal unedited list.
AUDIENCE KEYWORD ENRICHMENT: After identifying audience from seller notes (priority) or artwork context, consider this relevant vocabulary: women/girls/mom/mother/grandma/grandmother for female-focused designs; men/boys/kids/dad/father/grandpa/grandfather for male-focused designs; women/men/boys/girls/kids for neutral designs. Explicit seller-required audience terms remain; otherwise require evidence for family roles. Additional synonyms are optional: choose only those that fit naturally, never cram every synonym into a sentence or repeat mom/mother, grandma/grandmother, dad/father, or grandpa/grandfather just to add keywords. Add a specific interest audience grounded in the design, such as cat lovers or flower lovers, when relevant. Do not infer parenting, age, or family relationships of depicted people. Use meaningful audience phrases in the bullets and keyword plan; do not force standalone demographic words into Title or invent search-volume claims. Translate optional phrases into the listing language.
LISTING COPY RESTRICTION: Never describe the image background/backdrop, white/black/transparent background, isolation, canvas, mockup, file format, PNG/JPEG/SVG, DPI, pixels, resolution, print-ready status, vectorization, or editing/export technique in listing fields, keywords or seoPlan. Describe the actual subject, visible wording, holiday, colors of the subject, and shopper-relevant artistic style only. Realistic, retro and watercolor styles are optional when evidenced; Cartoon stays internal. Apply this rule in every listing language and during repairs. Background observations may remain in internal analysis only.
Identify one primary search phrase describing the main niche, then 3–6 complementary secondary phrases and 2–4 natural long-tail phrases. Ground every phrase in visible wording, subject, supported event, visual style, or seller-confirmed niche. Prefer specific shopper language over generic adjectives. Never invent search volume, competition, ranking scores, trends, or live research.
Return seoPlan={primary:"",secondary:[],longTail:[]}. Use the primary phrase naturally in the title when exact artwork wording and the supported event leave room; otherwise retain it in a bullet. Distribute secondary phrases between complementary bullets, without turning sentences into keyword lists. Use only the phrases that fit naturally; the plan is not a quota.
Return up to 12 useful keywords, fewer for simple artwork. Exclude generic filler, isolated audience words, duplicate word-order variants, singular/plural duplicates, unrelated occasions and unsupported breeds. Do not manufacture phrases to reach a count. Audience requirements in Bullet 2 remain, but are not evidence of keyword demand.
Bullets should be informative complete sentences, 75–255 characters each, aiming for 180–245 only when there are enough supported details. Never pad to reach a minimum or add generic composition commentary. Description remains exactly both bullets joined by one space. These relevance rules override earlier fixed keyword counts and 230-character minimums.`;

  function select(result, isSafe) {
    const plan = result.seoPlan || {};
    const normalize = value => String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
    const safe = value => typeof value === "string" && normalize(value).length <= 60 && isSafe(normalize(value));
    const primary = safe(plan.primary) ? normalize(plan.primary) : normalize(result.analysis?.mainNiche || "");
    const unique = values => {
      const seen = new Set();
      return values.filter(safe).map(normalize).filter(term => {
        const words = term.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
        if (!words.length || words.every(word => /^(kids|boys|girls|women|men|art|design|graphic|artwork)$/.test(word))) return false;
        const key = [...new Set(words.map(word => word.length > 3 && !/(?:ss|us|is)$/.test(word) ? word.replace(/s$/, "") : word))].sort().join(" ");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const keywords = unique([primary, ...(Array.isArray(plan.secondary) ? plan.secondary : []), ...(Array.isArray(plan.longTail) ? plan.longTail : []), ...(Array.isArray(result.keywords) ? result.keywords : [])]).slice(0, 12);
    return {keywords, seoPlan:{primary:isSafe(primary) ? primary : "",secondary:unique(Array.isArray(plan.secondary) ? plan.secondary : []).slice(0,6),longTail:unique(Array.isArray(plan.longTail) ? plan.longTail : []).slice(0,4),basis:"Artwork and seller context; no search-volume data"}};
  }
  function noteTerms(value = "") {
    const stop = new Set("a an the and or for with of in on to this that design artwork please include add keyword keywords listing title bullet bullets notes note".split(" "));
    return [...new Set((String(value).normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(word => !stop.has(word)))];
  }
  function missingNotes(copy, terms) {
    const words = new Set(String(copy).normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
    return terms.filter(word => !words.has(word));
  }
  function familyTerms(notes = "", gender = "") {
    const female = /\b(?:women|woman|female|girls?|mom|grandma)\b/i.test(notes);
    const male = /\b(?:men|man|male|boys?|dad|grandpa)\b/i.test(notes);
    const groups = [];
    if (female || (!male && gender === "women")) groups.push("women", "grandma", "mom", "girls");
    if (male || (!female && gender === "men")) groups.push("men", "boys", "kids", "grandpa", "dad");
    return [...new Set(groups)];
  }
  function explicitAudience(notes = "") {
    const female = /\b(?:women|woman|female|girls?|mom|grandma)\b/i.test(notes);
    const male = /\b(?:men|man|male|boys?|dad|grandpa)\b/i.test(notes);
    return female && male ? "unisex" : female ? "women" : male ? "men" : "";
  }
  root.MerchSEO = {instructions, select, noteTerms, missingNotes, familyTerms, explicitAudience};
})(globalThis);
