# Changelog

## 1.1.88
- Send the previous generation error to the AI on the next Generate attempt, including a single independent recheck of prior policy blocks; confirmed or uncertain safety blocks still stop listing generation.

## 1.1.87
- Use low adaptive effort for Claude Haiku 5.5 Auto Fast requests and API checks to reduce response latency.


## 1.1.86
- Speed up Claude Auto Fast listing generation by using the concise listing prompt and a 4,096-token response cap while preserving the separate artwork safety analysis and local validations.


## 1.1.85
- Add Anthropic's required direct-browser access header to Claude model discovery and API requests, fixing Claude API tests from the extension.


## 1.1.84
- Show Claude API 401 authentication errors and 403 permission errors separately, including Anthropic's response message for clearer diagnosis.


## 1.1.83
- Remove CodeCraft API support and add Anthropic Claude with model discovery, primary and backup keys, API testing, and listing generation alongside Gemini and OpenAI.


## 1.1.82
- Stop treating cute or playful artwork as humor by itself; add Cute to Title when Stage 1 verifies that visual style.

## 1.1.81
- Add the required Funny keyword directly when humor is confirmed, avoiding a failed extra AI repair request.

## 1.1.80
- Preserve Funny in humorous design titles even when it exceeds Amazon’s 59-character limit.

## 1.1.79
- Require the exact word Funny in Title for designs whose analyzed tone is clearly humorous, while leaving serious designs unaffected.

## 1.1.78

- Add a standalone Amazon Listing Keyword Optimizer extension with local keyword projects, listing analysis, autocomplete, visible-result extraction, and sequential indexing checks.

## 1.1.77
- Remove punctuation and symbol characters from generated listing fields and keywords, replacing them with spaces so words remain readable.
- Rebuild the Description from the cleaned bullets and keep artwork-text validation punctuation-insensitive.

## 1.1.76
- Preserve full artwork wording and generated title content even when the Title exceeds Amazon's 59-character limit.
- Fill the over-limit title and show its character count so the seller can shorten it manually; SEO audit flags it for review without blocking generation.

## 1.1.71
- Fix a live generation failure that treated Funny/Sarcastic as visual-only styles despite supporting phrase interpretation.
- Accept tone evidence from analyzed humor, puns, slang and sarcasm while retaining checks for unsupported tone and visual aesthetics.

## 1.1.70
- Keep the original artwork transcription internal and generate a separate English title wording for foreign-language artwork.
- Assemble and validate English-only titles; reject foreign-script title wording and missing reliable translations.
- Preserve other listing-language preferences and display the English title wording in existing notes.

## 1.1.69
- Separate vision analysis from listing generation with validated structured evidence and per-job reuse during repair.
- Add a maintainable year-round occasion taxonomy without invented movable dates; rank direct, seller, seasonal and contextual matches independently.
- Distinguish visual subjects from patterns, depicted people from wearers/recipients, and explicit family matching from unsupported counts.
- Preserve the existing Keyword Planner, SEO Engine, provider settings, fields and Costume exception; show a compact intelligence summary in existing notes.
- Remove conflicting universal audience/style instructions, keep supported aesthetics optional, and validate known holiday/style claims against analysis.
- Add deterministic category fixtures and provider-payload/repair regression tests; increase structured Gemini phase output budget to 4096.

## 1.1.68
- Allow the Amazon zme-caps artwork source used in existing-design edit pages.
- Include Amazon session credentials for that artwork host and bound image fetch to 20 seconds.
- Distinguish artwork network/access errors and image HTTP failures from AI provider failures.

## 1.1.67
+- Preserve the literal word Costume in Title when it is written on the artwork, including local title assembly and transcription validation.
+- Keep the restriction in Brand, bullets and non-artwork title text. No tests run at seller request.

## 1.1.66
- Add a separate local SEO Engine while preserving the current Keyword Planner and its output.
- Classify complete keyword phrases, show copy placement and evidence, remove duplicate bullet sentences, and audit lengths, repetition, restricted terms and description consistency.
- Display the engine report in keyword notes, clearly distinguishing local review findings from search demand or ranking metrics.
- Add offline regression coverage including the full background generation path with a mocked provider.

## 1.1.65
- Honor explicit women/men notes in Title and both bullets; stop forcing the opposite audience into gender-specific listings.
- Remove Typography/Cartoon labels from copy and keywords and stop appending mandatory style labels to titles.
- Validate audience coverage and reject unrelated opposite-audience terms during targeted repair.

## 1.1.64
- Add optional audience synonyms (mother, grandmother, father, grandfather) and design-specific interest audiences to SEO planning.
- Select relevant phrases naturally without requiring redundant family-role synonyms or additional AI calls.

## 1.1.63
- Edit unordered seller keywords into natural SEO phrases instead of requiring literal raw tokens.
- Expand female/male audience roles in Bullet 2, honoring explicit audience notes before inferred audience.
- Validate audience coverage and preserve the AI-edited title context.

## 1.1.62
- Require significant seller-note words in Title and both bullets, with validation and targeted repair.
- Preserve seller context during local title assembly; let optional style words yield to notes within the title limit.

## 1.1.61
- Exclude background and file/export terminology from listing copy and SEO keywords.
- Remove background clauses from bullets while retaining the subject description; validate remaining technical terms before filling.

## 1.1.60
- Refine the red Generate button with focus, hover and loading states.
- Clear listing fields before generation and preserve the previous values for Undo fill.
- Treat the optional box as supplemental keywords/occasion context, keeping the scanned design as the main niche and preserving visual transcription.
- Include seller keywords in cache identity.

## 1.1.59
- Add primary, secondary and long-tail SEO planning within the existing AI request.
- Remove fixed keyword count, arbitrary keyword expansion and generic bullet padding.
- Allow concise useful bullets from 75 to 255 characters and show keyword plan in notes.

## 1.1.58
- Use visual subject and scene details in automatic bullet padding when artwork has no text; avoid invented wording or lettering references.

## 1.1.57
- Allow CodeCraft up to 90 seconds to complete larger vision listing responses; clarify the timeout guidance.

## 1.1.56
- Restore a sufficient CodeCraft output budget for the compact Fast prompt so the model can finish its JSON response.
- Display CodeCraft's actual 402 billing message instead of assuming the account has exhausted its token allowance.

## 1.1.55
- Show the actual CodeCraft primary and backup key errors when both fail, without mislabeling exhausted balance as a rate limit.

## 1.1.54
- Retry CodeCraft generation with the backup key when the primary key reports exhausted plan allowance or balance, as well as rate limits.

## 1.1.53
- Shorten CodeCraft Auto Fast's artwork prompt and response budget while retaining listing, audience, event, and risk rules; build the remaining keywords locally.
- Correct the CodeCraft model count label when the provider omits capability metadata.

## 1.1.52
- Accept CodeCraft's live `/v1/models` response when it provides model IDs without capability metadata; prefer known image-capable Gemini models for Auto Fast and Auto Pro.

## 1.1.51
- Add CodeCraft API as a provider with separate provider and model selectors, dynamically loaded vision-capable models, primary and backup keys, API tests, and quota/rate-limit backup-key support.

## 1.1.50
- Format generated Titles in normal title case instead of copying all-caps artwork lettering.


## 1.1.49
- Preserve long exact artwork wording and its holiday/event when the title is too full to include optional theme/style labels.


## 1.1.48
- Include artwork wording and title assembly details when title validation finds a mismatch, so the cause can be fixed accurately.


## 1.1.47
- Shorten the holiday/event label when assembling a title so the exact artwork wording, event, theme, and style can fit Amazon’s title limit.


## 1.1.46
- Compare artwork text and generated Title without case sensitivity to prevent false exact-text validation errors.

## 1.1.45
- Remove GroqCloud support and clear its saved keys and model catalog when the extension updates.
- Add a popup control that makes a small text-only generation request for every entered Gemini and OpenAI primary or backup key, then reports each result.

## 1.1.44
- Add GroqCloud as a selectable AI provider with its own model catalog, primary API key, and quota-triggered backup API key.
- Use Groq's vision-capable Qwen model to analyze artwork and return structured listing JSON.

## 1.1.43
- Keep bullet repairs on complete sentence boundaries and avoid cutting required audience phrases.
- Remove singular and plural gathering suggestions from bullets.

## 1.1.42
- Replace promotional “gift” wording in listing copy with neutral design wording while preserving the required Brand ending.

## 1.1.41
- Validate title theme, style, and event labels by their included words, so valid reordered or overlapping labels do not fail generation.

## 1.1.40
- Preserve audience wording in Bullet 2 while removing suggested-wear clauses.
- Clean orphan punctuation and fragments from bullets; skip repeated local completion sentences.

## 1.1.39
- Keep Bullet 2 audience wording after removing suggested-use sentences.
- Try concise local sentence combinations before asking AI for a slow bullet-length repair.
- Simplify local style labels used for bullet completion.

## 1.1.38
- Prefer Gemini Flash Lite in Auto mode to reduce generation latency; Pro mode is unchanged.
- Treat pajamas and sleepwear as product types outside Description, and remove wear/use/event claims from generated bullets.

## 1.1.37
- Remove suggested-use and wear/occasion claims from bullets before character repair.
- Trim incomplete seasonal endings locally so the final bullet remains grammatical.

## 1.1.36
- Remove product-type words from the title even when the artwork text contains them, and validate against the cleaned title phrase.
- Use short, sentence-shaped visual details when a model response needs local character-length completion.
- Repair fragmented typography phrasing and replace comma-separated analysis labels in bullets.

## 1.1.35
- Remove instruction-like policy text, generic filler and sentence fragments from bullets before completing character-length checks.

## 1.1.34
- Allow product-type wording only when it is part of the exact scanned artwork phrase; continue checking all AI-added listing copy.

## 1.1.33
- Fit the scanned artwork wording, event, theme and style into the Amazon title by shortening optional labels locally when needed.

## 1.1.32
- Remove promotional “great addition” copy locally so Bullet 2 stays focused on the visible artwork and can be length-checked cleanly.

## 1.1.31
- Check the original artwork phrase directly before removing product-type wording, avoiding an uninitialized title variable during generation.

## 1.1.30
- Remove stray product-type terms from Brand and Bullets locally before length validation, preserving the exact artwork phrase in Title.

## 1.1.29
- Complete short bullets locally with image-grounded sentences while preserving mandatory audience words and Amazon's character limits.

## 1.1.28
- Recover a short or duplicate AI keyword list by building safe, unique phrases from the scanned design analysis and listing copy.
- Add full stops to complete bullets before assembling the two-bullet Description.

## 1.1.27
- Add sentence-ending punctuation to complete bullets so the locally assembled Description reads cleanly between Bullet 1 and Bullet 2.

## 1.1.26
- Close sentences cleanly after shortening overlong bullets so length correction does not leave dangling articles, prepositions, or partial phrases.

## 1.1.25

- Remove repeated title words when the event name is already present in the exact artwork text.
- Keep the title analysis labels aligned with the concise labels actually used in the title.
- Update all three extension version labels.

## 1.1.24

- Restore the popup status-message helper so settings initialize without a ReferenceError.
- Update all three extension version labels.

## 1.1.23

- Add an optional backup API key for Gemini or OpenAI and switch to it automatically on quota or rate-limit errors.
- Keep Gemini's fast-model fallback available after primary and backup key attempts.
- Update all three extension version labels.

## 1.1.22

- Keep kids, boys, girls, women, and men mandatory in Bullet 2, with a more natural local fallback sentence.
- Allow Auto Gemini mode to retry quota, rate-limit, and service errors once with Gemini Flash Lite.
- Cap individual AI requests at 40 seconds so stalled generations stop sooner.
- Update all three extension version labels.

## 1.1.21

- Add the five required audience keywords to Bullet 2 locally when the model omits them.
- Normalize bullet length on the first draft and return the actual validation error if repair fails.
- Update all three extension version labels.


## 1.1.20

- Require kids, boys, girls, women, and men in Bullet 2 for every design.
- Retry measured bullet-length errors with a text-only correction instead of stopping after the first draft.
- Preserve all five required audience terms while shortening repaired Bullet 2 text.
- Update all three extension version labels.


## 1.1.19

- Keep added visual details concise and word-complete so repaired bullets fit Amazon limits.
- Update all three extension version labels.


## 1.1.18

- Build repaired bullets to 230–255 characters using grounded subject, event, theme, and style details.
- Update all three extension version labels.


## 1.1.17

- Normalize overlong repaired bullets locally while preserving required Bullet 1 audience terms.
- Add concise artwork-grounded detail to short repaired bullets and rebuild Description from the final bullets.
- Update all three extension version labels.


## 1.1.16

- Remove adult/adults phrasing locally before validating listing fields and keywords.
- Combine missing Bullet 1 audience terms with length errors into one focused repair request.
- Limit automatic correction to one retry to avoid stacking long model calls.
- Update all three extension version labels.

## 1.1.15

- Make bullet-length repairs restate all five required Bullet 1 audience keywords explicitly in the selected language.
- Preserve the no-adult rule and the 230–255 character range during repairs.
- Update all three extension version labels.

## 1.1.14

- Remove adult/adults from all listing text and keywords.
- Require Bullet 1 to include kids, boys, girls, women, and men for every design; use translated equivalents for other listing languages.
- Keep audience keywords within existing bullet character limits and retry drafts that omit any required term.

## 1.1.13

- Prioritize Gemini 3.6 Flash in Auto mode for faster listings; keep Gemini Flash Lite as the automatic fallback.
- Reduce the Flash output-token ceiling from 2,400 to 1,800 while retaining the full listing and analysis schema.
- Update all three extension version labels.

## 1.1.12

- Avoid resizing preview images twice and reuse prepared data for the same uploaded File object.

- Require the specific supported holiday/event name in Title and include event status in design analysis.
- Provide the turkey/Thanksgiving title example and prioritize the event during repairs.
- Assemble missing title components locally when all verified text, event, theme and style labels fit within 59 characters.
- Use a short clear filename (up to 50 basename characters and 5 cleaned words) as Main Niche; ignore long filenames entirely and infer the niche only from artwork/text.
- Distinguish completed artwork capture from waiting on the AI in the status text.


## 1.1.11

- Read artwork at up to 1800px and use high-detail OpenAI image input for lettering.
- Require exact artwork text at the start of Title, with concise visible theme and style labels within 59 characters.
- Record transcription/confidence and title labels in design analysis and check Title consistency locally.
- Stop for unclear lettering or text exceeding the title limit; allow seller-supplied exact wording.
- Add Gifts to every Brand before length validation and allow that word only in the Brand copy check.


## 1.1.10

- Add a custom red M/AI-spark logo with Chrome toolbar icons in 16, 32, 48, and 128 pixels, plus editable SVG and 512px export.
- Apply the requested red theme to the popup, inline toolbar, and Generate button.

- Report exactly which listing fields violate their character range, with measured lengths and allowed ranges.
- Repair only the invalid-length fields, preserving valid fields, keywords, and safety reports; allow up to two repair attempts.
- Give AI explicit measured counts and narrower target ranges with headroom below each maximum.
- Keep the 230–255 character bullet rule and required audience validation; rebuild Description from the corrected bullets.


## 1.1.9

- Prioritize lightweight models in Auto (Gemini Flash Lite / OpenAI Luna); preserve explicit models and Auto Pro.
- Keep model discovery out of generation; use the catalog already loaded by the popup.
- Reuse valid identical-input results for five minutes in worker memory and combine duplicate in-flight requests.
- Read settings and prepare artwork once per generation; text-only repair reuses the draft analysis.
- Shorten report output and reduce output budgets for fast models while keeping listing rules and validation.
- Do not introduce a ten-second cutoff; external API latency is not guaranteed.


## 1.1.8

- Redesign the popup with a combined provider/model selector, API key field, official key links, Auto and Auto Pro modes.
- Fetch account-accessible Gemini generation models and compatible OpenAI models; cache model lists and keep separate provider keys.
- Add OpenAI image-based listing generation with the Responses API and shared listing validation.
- Require explicit design-appropriate audience wording in Bullet 2; neutral designs name women and men.
- Require both bullets to contain 230–255 characters, aiming for 245–255, with automatic draft repair.
- Continue building Description solely from the two bullets.


## 1.1.7

- Open a compact API-key-only toolbar popup instead of the side panel or a new Amazon tab.
- Remove design upload, listing generation, reports, model selector, and extra settings from the popup.
- Preserve the saved API key and existing listing preferences; keep in-page generation available.
- Remove unused sidePanel and clipboardWrite permissions.


## 1.1.6

- Enrich feature bullets with relevant niche keywords and design-appropriate audience terms; target 180–240 characters when supported.
- Return 25 unique, relevant keywords, with women/girls/grandma/mom or men/boys/grandpa/dad terms selected according to design relevance.
- Stop requesting AI Description text; build Description locally from exactly Bullet 1 + one space + Bullet 2 in both generators.
- Keep side-panel Description synchronized with bullet edits and read-only.


## 1.1.5

- Move the default Gemini 3.8 Flash setting to Gemini 3.6 Flash, which supports minimal thinking; preserve other custom models.
- Use minimal thinking only on supported Flash models in inline and side-panel generation.
- Request concise descriptions and risk reports to reduce output latency while retaining all rules and checks.
- Fall back once to Gemini 3.5 Flash Lite if the default fast model reports server overload, keeping the same prompt and validation.
- Enforce Description-only placement for apparel/clothing/outfit/costume terms in local validation.
- Reduce the output budget to 4096 tokens and remove obsolete placeholder wording from repair instructions.

## 1.1.4

- Catch additional prohibited terms identified in the live editor, including magic and glow derivatives.
- Reject suggested-use and promotional phrases in Description and other listing fields.
- Give AI the rejected draft and all copy issues during automatic repair.

## 1.1.3

- Supply the cleaned design filename to AI as the main niche, preserving the named cat breed/type.
- Use image evidence for style, occasion, and visual details; flag a name/image mismatch.
- Allow up to 120 seconds per Gemini request and display elapsed time.

## 1.1.2

- Remove the variation token requirement from prompts, validation, saved preferences, and the side-panel UI.
- Generate complete design-specific titles and bullets without template placeholders.

## 1.1.1

- Refresh the page integration after extension updates while preserving the uploaded artwork.
- Move the compact listing toolbar above the editor, outside Amazon's field columns.
- Show the artwork used for generation, elapsed time, and an Undo fill control.
- Stream Gemini output, stop requests after a timeout, and repair an invalid draft once.
- Normalize metadata to single-line text; append both bullets to Description without invalid line breaks.
- Verify that Amazon retains all five filled fields.
- Tighten professional copy instructions and honor seller exclusions.

## 1.1.0

- Add generation and field filling on merch.amazon.com.
## 1.1.72
- Omit internal market qualifiers such as “(US)” and “(Canada)” from shopper-facing holiday wording in titles, while retaining the full taxonomy label for internal analysis.
- Fixes the live Thanksgiving title that incorrectly displayed “Thanksgiving (Us)”.

## 1.1.73
- Remove US/Canada market qualifiers from shopper-facing occasion labels in titles.
- If cleanup removes the entire second bullet, build one short, grounded replacement from the validated subject/theme/occasion and required audience wording.

## 1.1.74
- Clean up malformed “This festive captures” copy and remove wardrobe-use wording from listing bullets.
- Keep the evidence-based second-bullet fallback when cleanup removes all of Bullet 2.

## 1.1.75
- Remove malformed “This festive captures” sentences before validating bullets.
- Strip “to your wardrobe” phrasing while preserving the sentence’s subject and audience wording.

