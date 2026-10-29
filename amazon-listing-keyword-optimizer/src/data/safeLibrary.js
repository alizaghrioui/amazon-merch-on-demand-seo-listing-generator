(() => {
  const DEFAULT_SAFE_LIBRARY = Object.freeze({
    funny: ['funny','humor','humorous','sarcastic','sarcasm','witty','silly','goofy','hilarious','joke','dad joke','pun'],
    cute: ['cute','adorable','kawaii','sweet','cozy','aesthetic','whimsical','playful','quirky','wholesome'],
    style: ['retro','vintage','minimalist','cool','graphic','distressed','sunset','groovy','cottagecore'],
    audience: ['men','women','kids','boys','girls','teens','mom','dad','grandma','grandpa','teacher','nurse','coworker','best friend'],
    occasions: ['birthday','Halloween','Christmas','Thanksgiving',"Valentine's Day","Mother's Day","Father's Day",'summer','fall','autumn','spring','back to school'],
    themes: ['cat','dog','coffee','books','bookworm','plants','gardening','camping','hiking','fishing','gym','sloth','frog','mushroom','axolotl','capybara','ghost','pumpkin','sunset','mountains']
  });
  const cloneDefaults = () => Object.fromEntries(Object.entries(DEFAULT_SAFE_LIBRARY).map(([key, words]) => [key, [...words]]));
  function migrateSafeLibrary(existing) {
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) return cloneDefaults();
    const migrated = {};
    for (const [category, defaults] of Object.entries(DEFAULT_SAFE_LIBRARY)) {
      const current = Array.isArray(existing[category]) ? existing[category] : defaults;
      migrated[category] = [...new Set(current.map(x => String(x || '').trim()).filter(Boolean))];
    }
    for (const [category, words] of Object.entries(existing)) if (!(category in migrated) && Array.isArray(words)) migrated[category] = [...new Set(words.map(x=>String(x||'').trim()).filter(Boolean))];
    return migrated;
  }
  const api = { DEFAULT_SAFE_LIBRARY, cloneDefaults, migrateSafeLibrary };
  globalThis.SafeLibrary = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
