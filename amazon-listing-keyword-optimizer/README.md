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

Keywords, listing drafts, settings, history, and the editable Safe Library remain in Chrome local extension storage. Autocomplete and indexing send the user-requested search phrases to Amazon. No analytics, remote code, or third-party AI service is used. Permissions are for local storage, side-panel access, the active tab, tab management, and the configured Amazon marketplace hosts.

## Tests

Run the pure-function tests with Node.js:

```sh
node --test tests/*.test.cjs
```

## Safe Library and Title Builder

The **Library** tab starts with editable Funny, Cute, Style, Audience, Occasion, and Theme word sets. Library edits are stored under `safeLibrary` in `chrome.storage.local`; the default set is installed only when that key is absent, so existing projects and custom library words remain intact. Click a word chip to add it to the active project's keyword workspace. Terms in the editable trademark blocklist appear in red; this is only a warning, not trademark clearance. Use **Reset to defaults** to replace the library with the shipped lists.

Open **Listing → Title Builder** to select a tone, theme, audience, style, custom design wording, and product type. Generate up to ten unique variations and inspect each title's length, short/long-tail phrase counts, and blocklist hits before using it. Generated titles are never cut to fit the configured limit; over-limit titles remain intact with a manual-review warning. Example titles are inspiration only; check slogans on the USPTO site before use.

## Policy Checker and listing drafts

Policy checks run while listing fields change. They flag configured forbidden claims, Amazon in Brand/Title, risky reference wording, sensitive-group humor, title punctuation/capitalization, title length, and unlisted three-word slogans. Slogan warnings link to USPTO search. Configure forbidden claims, sensitive terms, and the score weight in Settings. The score's component weights always total 100%; policy safety is enabled by Merch on Demand mode. Title overages stay editable and are advisory: the checker never truncates the title.

**Generate from template** creates editable starting drafts for Brand, two bullets, and Description from the Title Builder selections. Use **Next variation** to cycle through alternative drafts. These are templates, not validated claims; review each phrase and remove anything that does not describe the design. The default sample call to action is editable and can be removed.

This list is not exhaustive. Merch on Demand policies change; always check the official content guidelines and the USPTO database before publishing. Policy and trademark checks are preliminary writing aids, not legal advice.

### Manual Chrome checks

1. Reload the unpacked extension and open its side panel. Confirm the Library tab shows all six categories; click a chip and verify it is added to the active project's keywords.
2. Add/edit/delete a library word, close and reopen the side panel, and confirm the changes persist. Reset and confirm the shipped words return without altering existing projects.
3. In Listing → Title Builder select all slots, use a long custom phrase, and generate variations. Confirm there are no repeated words, no cut words, counts are shown, and titles over the limit remain whole.
4. Use an example title and confirm the slogan-review reminder is visible. Use as Title and verify the editor and live checks update.
5. Enter forbidden claim text, “Amazon” in Brand, a reference phrase, a sensitive term, excessive punctuation/uppercase, and a custom three-word slogan in separate fields. Confirm each corresponding warning appears and the USPTO link opens a search.
6. Change the policy weight and confirm score weights add to 100%. Toggle Merch on Demand mode off and verify policy checks stop; turn it on and verify they return.
7. Generate template drafts; review Brand and both bullets, cycle each Next variation button, edit the Description, and confirm edits persist after switching projects.
