# SEO Engine

`seo-planner.js` remains the Keyword Planner. It supplies the same primary,
secondary and long-tail plan and selected phrases as before.

`seo-engine.js` adds three pure operations:

- `classify(result, notes, isSafe)`: classifies complete planner phrases as subject,
  occasion, visual, audience or seller context; shows phrase placement in copy.
- `optimize(result, prompt)`: normalizes whitespace, removes identical sentences
  within each bullet and rebuilds Description from both bullets. It returns a new
  listing and a record of changes without modifying the caller's plan.
- `audit(result, options)`: checks lengths, restricted and seller-excluded terms,
  description consistency, phrase repetition and lexical relevance evidence.

The background worker includes the engine's editorial instructions in the listing
stage following the structured visual analysis (see DESIGN_INTELLIGENCE.md).
After existing sanitation it performs local optimization, then
runs existing validators and the engine audit. Copy errors use the existing
bounded repair flow. Review suggestions do not trigger extra requests or insert
keywords automatically. Results gain `seoReport`; `seoPlan` remains available.
The report appears in the existing keyword and safety notes disclosure.

Statuses are local copy checks, not an SEO ranking or approval score. Classification
uses token matches against AI analysis and seller notes, not independent image
verification or demand data. Semantically valid synonyms may need review. Phrase
coverage uses contiguous normalized tokens. Description is excluded from repetition
checks because it intentionally repeats both bullets. No search volume,
competition, sales predictions or live trademark claims are generated.

Run regression checks with `node --test seo-engine.test.cjs`. They use fixture
responses and no real keys or network calls, including a complete background
generation path with mocked analysis and listing responses.
