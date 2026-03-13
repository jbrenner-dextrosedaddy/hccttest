// src/utils.js
// All text processing, diff engine, and keyword logic
// Supports Unicode / Spanish via \p{L} regex

// ─────────────────────────────────────────────────────────────────────────────
// Stop words — English + Spanish
// ─────────────────────────────────────────────────────────────────────────────

export const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","can","it","its","this",
  "that","these","those","they","them","their","he","she","we","you","i",
  "as","by","from","into","through","during","before","after","above","below",
  "if","then","so","such","than","too","very","just","also","not","no","more",
  "which","who","what","when","where","how","all","each","both","few","some",
  "any","most","other","only","same","once","here","there","our","your",
  // Spanish
  "el","la","los","las","un","una","unos","unas","del","al","en","de","que",
  "es","por","con","para","como","pero","sin","sobre","entre","ya","se","su",
  "sus","le","les","me","te","nos","más","así","todo","esta","este","estos",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Tokenizer — Unicode-safe, handles Spanish accented chars
// ─────────────────────────────────────────────────────────────────────────────

export function tokenizeUnicode(text) {
  if (!text) return [];
  try {
    return [...text.matchAll(/\p{L}+/gu)].map(m => m[0].toLowerCase());
  } catch {
    // Fallback for older environments
    return (text.toLowerCase().match(/[a-záéíóúüñàèìòùâêîôûäëïöü]+/g) || []);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stemmer — strips common English + Spanish suffixes
// Normalizes tumor/tumors, ablation/ablaciones etc.
// ─────────────────────────────────────────────────────────────────────────────

export function stem(word) {
  return word
    .replace(/aciones$/, "")
    .replace(/ación$/,   "")
    .replace(/iones$/,   "")
    .replace(/ión$/,     "")
    .replace(/ments?$/,  "")
    .replace(/ations?$/, "")
    .replace(/ings?$/,   "")
    .replace(/tion$/,    "")
    .replace(/ness$/,    "")
    .replace(/ical$/,    "")
    .replace(/ally$/,    "")
    .replace(/ically$/,  "")
    .replace(/ers?$/,    "")
    .replace(/s$/,       "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Core word utilities
// ─────────────────────────────────────────────────────────────────────────────

export function wordSet(text) {
  const tokens = tokenizeUnicode(text).filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(tokens.map(stem));
}

export function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff engine
// ─────────────────────────────────────────────────────────────────────────────

export function computeUniqueWords(cardText, peerTexts) {
  const mine   = wordSet(cardText);
  const theirs = new Set(peerTexts.flatMap(t => [...wordSet(t)]));
  return new Set([...mine].filter(w => !theirs.has(w)));
}

export function diffScore(cardText, peerTexts) {
  const mine = wordSet(cardText);
  if (mine.size === 0) return 0;
  const theirs = new Set(peerTexts.flatMap(t => [...wordSet(t)]));
  const unique = [...mine].filter(w => !theirs.has(w)).length;
  return Math.round((unique / mine.size) * 100);
}

export function topUniqueTerms(cardText, peerTexts, n = 6) {
  const tokens = tokenizeUnicode(cardText).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  const theirs = new Set(peerTexts.flatMap(t => [...wordSet(t)]));
  const freq   = {};
  tokens.forEach(w => {
    const s = stem(w);
    if (!theirs.has(s)) freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword engine
// ─────────────────────────────────────────────────────────────────────────────

export function suggestedKeywords(responses, n = 8) {
  const freq = {};
  responses.forEach(r => {
    tokenizeUnicode(r)
      .filter(w => w.length >= 4 && !STOP_WORDS.has(w))
      .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

export function countKeywordMatches(text, keywords, partialMatch) {
  if (!text || !keywords.length) return 0;
  let count = 0;
  tokenizeUnicode(text).forEach(tok => {
    keywords.forEach(kw => {
      const kwClean = kw.term.toLowerCase();
      const matches = partialMatch ? tok.includes(kwClean) : tok === kwClean;
      if (matches) count++;
    });
  });
  return count;
}
