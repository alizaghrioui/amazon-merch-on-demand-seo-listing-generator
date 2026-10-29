const test = require('node:test');
const assert = require('node:assert/strict');
const keywords = require('../lib/keywords.js');
const trademarks = require('../lib/trademarks.js');
globalThis.KeywordTools = keywords;
globalThis.TrademarkTools = trademarks;
const listing = require('../lib/listing.js');

test('keyword classifier counts Unicode word tokens and distinguishes short and long tail', () => {
  assert.deepEqual(keywords.classifyKeyword('Breast Cancer'), { count: 2, type: 'short' });
  assert.deepEqual(keywords.classifyKeyword('In October We Wear Pink'), { count: 5, type: 'long' });
  assert.deepEqual(keywords.classifyKeyword(''), { count: 0, type: 'short' });
});

test('workspace parser trims and removes case-insensitive duplicates', () => {
  assert.deepEqual(keywords.parseKeywords(' Cat Lover \ncat lover\n orange tabby,cat'), ['Cat Lover','orange tabby','cat']);
});

test('CSV import reads the keyword column and handles quoted commas', () => {
  assert.deepEqual(keywords.parseCsvKeywords('keyword,word_count,type\n"cats, cozy",2,short\nfunny cat,2,short'), ['cats, cozy','funny cat']);
});

test('n-gram extractor removes stop words and ranks repeated phrases', () => {
  const result = keywords.ngrams('The funny cat shirt and funny cat shirt');
  assert.equal(result[0].phrase, 'cat shirt');
  assert.equal(result.find(x => x.phrase === 'funny cat shirt').count, 2);
  assert.ok(!result.some(x => x.phrase.split(' ').includes('the')));
});

test('trademark matcher checks whole terms without matching embedded substrings', () => {
  assert.deepEqual(trademarks.findMatches('A Mickey Mouse style cat and Nike shoes'), ['Mickey','Nike']);
  assert.deepEqual(trademarks.findMatches('disneyland vacation', ['Disney']), []);
});

test('listing analyzer scores keyword placement, repetition, limits and duplicate-sentence information', () => {
  const result = listing.analyze(
    { title:'Funny Cat Shirt', brand:'Cat Studio', bullets:['Funny cat shirt for cat lovers.','A playful orange tabby illustration.'], description:'Funny cat shirt for cat lovers. A thoughtful design.' },
    ['funny cat','orange tabby','cat lovers'], ['funny cat','orange tabby'], [], { title:60, brand:50, bullet:256, description:2000 }, { perField:3, total:5 }
  );
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(result.scoreBreakdown.coverage, 100);
  assert.equal(result.placement[0].title, true);
  assert.equal(result.placement[1].bullets, true);
  assert.equal(result.duplicateSentences.length, 1);
  assert.equal(result.trademarkHits.length, 0);
});

test('stuffing and trademark risks reduce the listing score', () => {
  const result = listing.analyze({title:'Nike Nike Nike cat cat cat cat',brand:'',bullets:[],description:''},['Nike','cat'],[],['Nike'],{title:60,brand:50,bullet:256,description:2000},{perField:3,total:5});
  assert.ok(result.stuffing.length >= 1);
  assert.deepEqual(result.trademarkHits,['Nike']);
  assert.equal(result.scoreBreakdown.noStuffing,0);
  assert.equal(result.scoreBreakdown.trademarkSafety,0);
});

test('listing template exposes editable placeholders and two initial bullets', () => {
  const value=listing.fromTemplate();
  assert.equal(value.bullets.length,2);
  assert.match(value.title,/\[/);
  assert.match(value.description,/\[/);
});
