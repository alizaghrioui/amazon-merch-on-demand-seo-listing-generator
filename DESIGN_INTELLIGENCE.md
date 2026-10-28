# Design intelligence pipeline

## Why listings missed context

Previously a single provider response both interpreted the image and wrote copy.
The compact legacy schema stored one event, one style and one audience label.
There was no evidence record, no distinction between a direct holiday and a
seasonal opportunity, and no independent treatment of depicted people, wearers
and recipients. Some prompt/repair instructions also forced all audience words
and styles into copy, despite later instructions making them conditional.

## Implementation

`holiday-taxonomy.js` defines semantic IDs, labels, kinds, broad month windows,
cue descriptions, movable-date flags, optional markets and IP review flags.
It covers the full year, movable religious/cultural events, milestones,
appreciation events and matching contexts. It deliberately supplies no exact
dates: month windows vary by market and hemisphere and are not date rules.
No exact-date feature or external calendar dependency is introduced.

`design-intelligence.js` builds the Stage 1 image prompt, parses and validates
structured evidence, ranks independent occasions and supplies Stage 2 context.
Accepted claims need a finite model-estimated confidence of at least 0.65 and
existing evidence IDs; contextual opportunities need at least 0.8. Evidence
excerpts attributed to seller notes or artwork text must actually occur there.
Weak, unsupported or mismatched claims become uncertainties rather than keywords.
Some ambiguous specific holidays require distinctive context. Generic symbols
cannot establish direct holidays without explicit text. Animal subjects cannot
be classified as animal-print patterns without pattern evidence. Specific family
counts need literal wording or seller context; depicted people are kept separate.

`background.js` calls the existing selected provider/model twice for a fresh job:

1. Stage 1 receives the real prepared artwork through the existing image payload
   path, plus seller context. The existing maximum image dimension is 1800 px;
   it is not replaced by a filename or a product description.
2. Stage 2 receives validated analysis, existing listing rules, Keyword Planner
   and SEO Engine instructions. It does not resend the image. A bounded copy
   repair reuses Stage 1 through a private per-job WeakMap. The existing full
   result cache and concurrent request deduplication remain.

Malformed/missing evidence, incomplete Gemini output, unclear text and unsupported
copy are rejected before filling. A blocked Stage 1 stops immediately. Gemini
uses the configured model/catalog, existing keys, backup/fallback logic and JSON
stream integration. The structured phases receive a 4096-token output budget.
No provider setting is changed and no OpenAI key is required for Gemini.

The legacy `analysis` object remains for existing title assembly and validation.
Exact transcription and the primary direct/seller occasion come from Stage 1.
The original transcription stays internal. Title always uses the separately
required `visibleText.titleTextEnglish` translation; non-Latin title letters and
missing translations stop filling. Other field language preferences remain.
This is a script guard plus model translation, not an independent English-language
detector: Latin-script foreign text still depends on the model translating correctly.
Useful evidenced aesthetic words are optional; technical production terms remain
excluded. Inferred audience terms follow evidence instead of forcing every age
and family role. Explicit seller audience preferences and applicable existing
restrictions remain. Matching/pajama/gift opportunities are internal when listing
rules prohibit those product/use claims. Description remains both bullets joined
by one space; the Costume-in-visible-text title exception is preserved.

`content.js` adds a compact intelligence summary to the existing notes disclosure,
including ranked occasions, distinct audience kinds, matching context and
uncertainties. No new settings page, permission or workflow is introduced.

## Validation and limitations

Run `node --test design-intelligence.test.cjs seo-engine.test.cjs`.
Fixtures cover Santa/family matching, audiences, Halloween, Valentine's, Easter,
parent appreciation, St. Patrick's, Thanksgiving, Ramadan/Eid, Lunar New Year,
Diwali, Vintage/Groovy, animal-print distinctions, numbered groups, generic art
and exact text. Integration checks inspect Gemini image payloads and simulate
streaming, malformed/incomplete responses, bounded repairs and blocked designs.
These deterministic fixtures are not measurements of live visual accuracy.

Confidence values are uncalibrated model estimates. Visual evidence is still
reported by the vision model; local validation cannot prove that a detail exists
in the pixels. Copy gates match known semantic labels and may require a repair
for synonyms or untranslated labels. No search volume, competition, live IP
search, ranking guarantee or calendar-date calculation is claimed. Two necessary
stages may increase latency and token cost versus the previous single-call flow.
