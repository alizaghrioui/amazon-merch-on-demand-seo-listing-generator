# MERCH PRO Amazon Merch on Demand Listing Generator and SEO Keyword Planner

MERCH PRO is a Chrome extension for Amazon Merch on Demand listing generation and SEO keyword planning. It analyzes print-on-demand artwork, drafts design-specific titles and bullets, checks listing copy against policy rules, and fills the Amazon Merch listing fields for your review.

## Install

1. Download or clone this repository.
2. In Chrome, open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked** and choose the repository folder that contains `manifest.json`.
4. Open the extension popup, choose an AI provider and model, enter an API key, then save. A second key can be configured as a backup.
5. Open [Amazon Merch on Demand](https://merch.amazon.com/), open the product details editor, and select **Generate listing & fill**.

Reload the extension from `chrome://extensions` after updating its files. Reload the Merch page if an older content script reports that its extension context was invalidated.

## What it does

- Reads visible artwork text and identifies the main niche, theme, style, and supported holiday or event.
- Creates a title, brand, two feature bullets, and a description made only from those bullets.
- Uses seller notes as listing context and plans relevant keywords without inventing search-volume or competition numbers.
- Removes punctuation and symbol characters from listing text, replacing them with spaces.
- Keeps complete artwork wording in the title even when it exceeds Amazon's 59-character title limit. The extension warns the seller to shorten it before publishing.
- Checks for restricted wording, product-type terms, seller exclusions, and preliminary trademark or copyright risks.
- Fills the browser fields only. Review the copy and Amazon's warnings yourself before saving or publishing.

## AI providers and privacy

The popup supports Gemini, OpenAI, and CodeCraft API models. You provide your own provider key. Keys are stored in Chrome's local extension storage. The selected provider receives the artwork image and listing prompt when you generate a listing. API key tests send a short text-only request. MERCH PRO does not operate a listing server or send listing data to a MERCH PRO backend. Your provider may charge for API use under its terms.

Official key pages:

- [Google AI Studio](https://aistudio.google.com/apikey)
- [OpenAI Platform](https://platform.openai.com/api-keys)
- [CodeCraft API](https://codecraftapi.com/)

## Trademark and copyright checks

AI risk notes are preliminary and are not legal advice. The extension does not perform a live trademark search and does not guarantee Amazon approval or search ranking. Review relevant records with the official [USPTO Trademark Search](https://tmsearch.uspto.gov/search/) before publishing.

## Development checks

Run the local test suite with Node.js:

```sh
node --test *.test.cjs
```
