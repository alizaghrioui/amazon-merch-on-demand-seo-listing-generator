(() => {
  const DEFAULT_BLOCKLIST = ['Disney','Mickey','Marvel','Nike','Pokemon','Pokémon','Nintendo','Star Wars','NFL','NBA','Harry Potter','Barbie','Hello Kitty','Super Bowl','Coca Cola','Adidas','Taylor Swift','Lego','Walt Disney'];
  function findMatches(text, terms = DEFAULT_BLOCKLIST) {
    const found = [];
    for (const raw of terms) { const term = String(raw || '').trim(); if (!term) continue;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(String(text || ''))) found.push(term);
    }
    return [...new Set(found)];
  }
  const api = { DEFAULT_BLOCKLIST, findMatches };
  globalThis.TrademarkTools = api; if (typeof module !== 'undefined') module.exports = api;
})();
