# Amazon Listing Keyword Optimizer

A Chrome Manifest V3 side-panel extension for collecting Amazon Merch on Demand keywords and checking listing copy. It keeps projects and settings in `chrome.storage.local` and makes no calls to an extension-owned server.

## Install locally

1. In Chrome, open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select this `amazon-listing-keyword-optimizer` folder (the folder containing `manifest.json`).
3. Open the extension popup and press **Open workspace**, or click the toolbar icon and use the extension side panel.
4. On an Amazon search-results page, use **Extract keywords** to read only visible result cards.

## Workspace and classifier

- Create, rename, and delete separate niche projects. Project keywords, priority stars, listing text, and indexing history save locally.
- Paste keywords one per line, or import `.txt`/`.csv`; duplicates are normalized case-insensitively. Export as text or CSV.
- Filter short-tail (one or two words) and long-tail (three or more words) phrases, sort them, and star priority terms.
- Counts describe word length only. The extension does not invent Amazon search-volume or competition data.

## Amazon autocomplete and visible-result extraction

- Expand a seed with Amazon's public autocomplete suggestions plus letter and number suffixes. Requests are sequential, user-triggered, and spaced by 350 ms; cancel stops the queue.
- On Amazon.com, Amazon.co.uk, or Amazon.de search pages, click the floating extractor button. It reads titles and ASINs from visible search-result cards only, then ranks words and 2–4 word phrases. It does not crawl other pages.
- Amazon can change its markup or autocomplete endpoint; selectors are centralized in `content/selectors.js`.

## Listing editor and checks

- Edit Brand, Title, two or more bullets, and Description. Use the editable template as a starting point; it is not AI-generated copy.
- Adjust character limits, repetition thresholds, marketplace, and a local editable trademark/risky-term blocklist in Settings.
- The live score reports keyword coverage, priority placement, repetition, short/long-tail mix, blocklist matches, and character limits. Repeated exact sentences between bullets and description are informational only.
- The preloaded term list is not exhaustive. Use the USPTO link to search a selected term; these checks do not establish legal clearance.
- Copy individual fields or the complete listing. Nothing is submitted to Amazon for you.

## Indexing checker

Enter a 10-character ASIN and choose workspace terms or paste a list. When you press **Start checks**, the extension opens background Amazon search tabs one at a time with at least 2.5 seconds between searches, checks visible `data-asin` results, records Indexed / Not indexed / Unknown, and closes each tab. Stop is available during the queue. If Amazon presents a captcha or verification page, that result is Unknown and the remaining queue stops. History is saved locally and can be exported as CSV.

The checker cannot guarantee Amazon indexing status: results can vary by marketplace, account, location, personalization, and page load. It does not bypass captchas or automate login.

## Privacy and permissions

Keywords, listing drafts, settings, and history remain in Chrome local extension storage. Autocomplete and indexing send the user-requested search phrases to Amazon. No analytics, remote code, or third-party AI service is used. Permissions are for local storage, side-panel access, the active tab, tab management, and the configured Amazon marketplace hosts.

## Tests

Run the pure-function tests with Node.js:

```sh
node --test tests/*.test.cjs
```
