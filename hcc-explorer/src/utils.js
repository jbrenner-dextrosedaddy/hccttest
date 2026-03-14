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
    return (text.toLowerCase().match(/[a-záéíóúüñàèìòùâêîôûäëïöü]+/g) || []);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stemmer — FIX: longer suffixes must be checked before shorter ones
// so "ically" fires before "ical", "ations" before "tion", etc.
// ─────────────────────────────────────────────────────────────────────────────

export function stem(word) {
  // Spanish first (longest → shortest)
  if (/aciones$/.test(word)) return word.replace(/aciones$/, "");
  if (/ación$/.test(word))   return word.replace(/ación$/, "");
  if (/iones$/.test(word))   return word.replace(/iones$/, "");
  if (/ión$/.test(word))     return word.replace(/ión$/, "");

  // English (longest → shortest)
  if (/ically$/.test(word))  return word.replace(/ically$/, "");
  if (/ations$/.test(word))  return word.replace(/ations$/, "");
  if (/ation$/.test(word))   return word.replace(/ation$/, "");
  if (/ments$/.test(word))   return word.replace(/ments$/, "");
  if (/ment$/.test(word))    return word.replace(/ment$/, "");
  if (/ings$/.test(word))    return word.replace(/ings$/, "");
  if (/ing$/.test(word))     return word.replace(/ing$/, "");
  if (/ness$/.test(word))    return word.replace(/ness$/, "");
  if (/ical$/.test(word))    return word.replace(/ical$/, "");
  if (/ally$/.test(word))    return word.replace(/ally$/, "");
  if (/tion$/.test(word))    return word.replace(/tion$/, "");
  if (/ers$/.test(word))     return word.replace(/ers$/, "");
  if (/er$/.test(word))      return word.replace(/er$/, "");
  if (/s$/.test(word))       return word.replace(/s$/, "");

  return word;
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
// FIX: IDF weighting — filter words that appear in >60% of responses
// so suggestions are distinctive, not just frequent across all cards
// ─────────────────────────────────────────────────────────────────────────────

export function suggestedKeywords(responses, n = 8) {
  if (responses.length === 0) return [];

  const termDocCount = {}; // how many responses contain this word
  const termFreq     = {}; // total occurrences across all responses

  responses.forEach(r => {
    const tokens = tokenizeUnicode(r).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
    const seenInDoc = new Set();
    tokens.forEach(w => {
      termFreq[w] = (termFreq[w] || 0) + 1;
      if (!seenInDoc.has(w)) {
        termDocCount[w] = (termDocCount[w] || 0) + 1;
        seenInDoc.add(w);
      }
    });
  });

  const total = responses.length;
  const UBIQUITY_THRESHOLD = 0.6; // ignore words in >60% of responses

  return Object.entries(termFreq)
    .filter(([w]) => {
      const docFreq = (termDocCount[w] || 0) / total;
      return docFreq <= UBIQUITY_THRESHOLD; // keep distinctive terms only
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword matching
// FIX: O(tokens) Set lookup instead of O(tokens × keywords)
// ─────────────────────────────────────────────────────────────────────────────

export function countKeywordMatches(text, keywords, partialMatch) {
  if (!text || !keywords.length) return 0;
  const tokens = tokenizeUnicode(text);

  if (partialMatch) {
    // Partial: must check includes() — can't use a Set, keep O(tokens × keywords)
    // but this is expected for partial match, not a bug
    let count = 0;
    tokens.forEach(tok => {
      keywords.forEach(kw => {
        if (tok.includes(kw.term.toLowerCase())) count++;
      });
    });
    return count;
  }

  // Whole word: build a Set from keyword terms for O(1) lookup per token
  const kwSet = new Set(keywords.map(kw => kw.term.toLowerCase()));
  return tokens.filter(tok => kwSet.has(tok)).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff precomputation — call this ONCE before render, not inside the loop
// Returns a Map keyed by cardKey → { dWords, dScore, tTerms }
// FIX: memoize expensive wordSet/diffScore calls outside render
// ─────────────────────────────────────────────────────────────────────────────

export function precomputeDiff(cards, showTopTerms) {
  // cards: [{ key, response, peers: [responseText] }]
  const result = new Map();
  cards.forEach(({ key, response, peers }) => {
    if (!response) {
      result.set(key, { dWords: null, dScore: 0, tTerms: [] });
      return;
    }
    const dWords = computeUniqueWords(response, peers);
    const dScore = diffScore(response, peers);
    const tTerms = showTopTerms ? topUniqueTerms(response, peers, 6) : [];
    result.set(key, { dWords, dScore, tTerms });
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-language diff warning
// Only warn when language is a FREE dimension (not assigned to row or col axis).
// When language IS a row or col axis, each row/col contains ONE language so
// comparisons are within the same language — no inflation, no warning needed.
// When language is FREE (not on any axis), multiple languages are pooled into
// the same peer group, inflating diff scores — warn the user.
// ─────────────────────────────────────────────────────────────────────────────

export function isCrossLanguageDiff(rowDim, colDim, selLangs) {
  // Only warn when language is a FREE dimension (not on any axis).
  // When rowDim or colDim = "language", each row/col is ONE language,
  // so peers are always same-language. No inflation. No warning.
  // When language is free (not on any axis), multiple languages get
  // pooled into the same peer group -> diff score inflated -> warn.
  const languageIsSeparated = rowDim === "language" || colDim === "language";
  const multipleLanguagesSelected = selLangs.length > 1;
  return !languageIsSeparated && multipleLanguagesSelected;
}
