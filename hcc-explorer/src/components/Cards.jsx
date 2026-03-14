// src/components/Cards.jsx
// ResponseCard, WordCountBar, TopTermsBadges, HighlightedText
// FIX: stem() imported from utils — no duplication

import { useMemo } from "react";
import { MODEL_META, THERAPY_COLOR, LANG_COLOR } from "../config/constants";
import { wordCount, countKeywordMatches, stem } from "../utils";

// ─────────────────────────────────────────────────────────────────────────────
// WordCountBar
// ─────────────────────────────────────────────────────────────────────────────

export function WordCountBar({ count, maxCount, color }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 14px 7px", borderTop: "1px solid #f1f1f1", background: "#fafafa",
    }}>
      <div style={{ flex: 1, height: 3, background: "#e5e5e5", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color + "88",
          borderRadius: 2, transition: "width .3s",
        }}/>
      </div>
      <span style={{ fontSize: 10, color: "#aaa", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
        {count} words
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopTermsBadges
// ─────────────────────────────────────────────────────────────────────────────

export function TopTermsBadges({ terms, color }) {
  if (!terms || terms.length === 0) return null;
  return (
    <div style={{ padding: "7px 14px 9px", borderTop: "1px solid #f1f1f1", background: "#fafafa" }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
        textTransform: "uppercase", color: "#aaa", marginBottom: 5,
      }}>
        Top Terms
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {terms.map(w => (
          <span key={w} style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 2,
            background: color + "15", color, fontWeight: 600, letterSpacing: 0.2,
          }}>
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HighlightedText
// FIX: uses imported stem() — single source of truth, no duplication
// ─────────────────────────────────────────────────────────────────────────────

export function HighlightedText({ text, keywords, highlightStyle, partialMatch, diffWords, diffColor }) {
  const segments = useMemo(() => {
    if (!text) return [];

    // Split preserving whitespace and punctuation as separate tokens
    const parts = [];
    let buf = "";
    for (const ch of text) {
      const isLetter = /\p{L}/u.test(ch);
      if (isLetter) {
        buf += ch;
      } else {
        if (buf) { parts.push({ tok: buf, isWord: true }); buf = ""; }
        parts.push({ tok: ch, isWord: false });
      }
    }
    if (buf) parts.push({ tok: buf, isWord: true });

    return parts.map(({ tok, isWord }) => {
      if (!isWord) return { text: tok, type: "plain" };

      const clean = tok.toLowerCase();

      // Keyword match — check before diff
      for (const kw of keywords) {
        const kwClean = kw.term.toLowerCase();
        const matches = partialMatch ? clean.includes(kwClean) : clean === kwClean;
        if (matches) return { text: tok, type: "keyword", color: kw.color };
      }

      // Diff match — use same stem() from utils (single source of truth)
      if (diffWords && clean.length >= 3) {
        const stemmed = stem(clean);
        if (diffWords.has(stemmed)) return { text: tok, type: "diff", color: diffColor };
      }

      return { text: tok, type: "plain" };
    });
  }, [text, keywords, highlightStyle, partialMatch, diffWords, diffColor]);

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "plain") return <span key={i}>{seg.text}</span>;

        if (seg.type === "keyword") {
          return highlightStyle === "underline"
            ? <span key={i} style={{
                borderBottom: `2px solid ${seg.color}`,
                color: seg.color, fontWeight: 700,
              }}>{seg.text}</span>
            : <mark key={i} style={{
                background: seg.color + "30", color: "#111",
                borderRadius: 2, padding: "0 1px",
                outline: `1.5px solid ${seg.color}55`,
                fontWeight: 600, fontStyle: "inherit",
              }}>{seg.text}</mark>;
        }

        if (seg.type === "diff") {
          return <mark key={i} style={{
            background: seg.color + "22", color: seg.color,
            borderRadius: 2, padding: "0 1px",
            outline: `1px solid ${seg.color}44`,
            fontStyle: "inherit",
          }}>{seg.text}</mark>;
        }

        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResponseCard
// ─────────────────────────────────────────────────────────────────────────────

export function ResponseCard({
  model, language, therapy, repetition, response,
  showWordCount, maxWordCount,
  showDiff, diffWords, diffScoreValue,
  showTopTerms, topTerms,
  keywords, highlightStyle, partialMatch,
  fontSize, fontFamily,
  modelColor,
  crossLanguageWarning,
}) {
  const mc = modelColor || MODEL_META[model]?.color || "#111";
  const ml = MODEL_META[model]?.label || model;
  const lc = LANG_COLOR[language]     || "#111";
  const tc = THERAPY_COLOR[therapy]   || "#111";
  const wc = wordCount(response);

  const kwMatches = useMemo(
    () => countKeywordMatches(response, keywords, partialMatch),
    [response, keywords, partialMatch]
  );

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e5e5", borderRadius: 4,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 1px 4px rgba(0,0,0,.05)", minWidth: 0,
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
        borderBottom: "1px solid #f1f1f1", background: "#fafafa", flexWrap: "wrap",
      }}>
        <span style={{ width: 3, height: 14, borderRadius: 1, background: mc, flexShrink: 0 }}/>
        <span style={{ fontSize: 11, fontWeight: 700, color: mc, letterSpacing: 0.3 }}>{ml}</span>
        <span style={{ color: "#ddd", fontSize: 10 }}>·</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: lc }}>{language}</span>
        <span style={{ color: "#ddd", fontSize: 10 }}>·</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 2,
          background: tc + "18", color: tc }}>{therapy}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#bbb" }}>Rep {repetition}</span>
        {showWordCount && (
          <span style={{ fontSize: 10, color: "#888", background: "#f0f0f0",
            padding: "1px 6px", borderRadius: 8 }}>
            {wc}w
          </span>
        )}
      </div>

      {/* ── Different Words metric — single line under header ── */}
      {showDiff && diffScoreValue !== undefined && (
        <div style={{
          padding: "4px 12px", borderBottom: "1px solid #f5f5f5",
          background: crossLanguageWarning ? "#fffdf5" : "#fdfcff",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {crossLanguageWarning ? (
            <span style={{ fontSize: 10, color: "#b45309", fontStyle: "italic" }}
              title="Score inflated — English and Spanish share no vocabulary. See banner above.">
              ⚠ {diffScoreValue}% unique words (cross-lang)
            </span>
          ) : (
            <>
              <div style={{ flex: 1, height: 2, background: "#ede9fe",
                borderRadius: 1, overflow: "hidden" }}>
                <div style={{
                  width: `${diffScoreValue}%`, height: "100%",
                  background: mc + "88", borderRadius: 1, transition: "width .3s",
                }}/>
              </div>
              <span
                style={{ fontSize: 10, color: "#7c3aed", whiteSpace: "nowrap", fontWeight: 600 }}
                title="Percentage of vocabulary in this response not found in comparison responses"
              >
                {diffScoreValue}% unique
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{
        padding: "14px 16px", fontSize: fontSize, lineHeight: 1.85, color: "#333",
        whiteSpace: "pre-wrap", fontFamily: fontFamily, flex: 1,
      }}>
        {response
          ? <HighlightedText
              text={response}
              keywords={keywords}
              highlightStyle={highlightStyle}
              partialMatch={partialMatch}
              diffWords={showDiff ? diffWords : null}
              diffColor={mc}
            />
          : <span style={{ color: "#bbb", fontStyle: "italic" }}>No data</span>
        }
      </div>

      {/* ── Top Terms ── */}
      {showDiff && showTopTerms && <TopTermsBadges terms={topTerms} color={mc} />}

      {/* ── Keyword match count ── */}
      {keywords.length > 0 && kwMatches > 0 && (
        <div style={{
          padding: "5px 14px", borderTop: "1px solid #f1f1f1",
          background: "#fafafa", fontSize: 10, color: "#888",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%",
            background: "#f59e0b", display: "inline-block" }}/>
          Keyword matches: {kwMatches}
        </div>
      )}

      {/* ── Word count bar ── */}
      {showWordCount && response && (
        <WordCountBar count={wc} maxCount={maxWordCount} color={mc} />
      )}
    </div>
  );
}
