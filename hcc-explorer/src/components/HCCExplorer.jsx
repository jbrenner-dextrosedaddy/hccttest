// src/components/HCCExplorer.jsx
// Redesigned: multi-keyword chips, unicode tokenizer, diff score, word count in header,
// analysis toolbar, suggested keywords, Spanish support, highlight style toggle.

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ALL_DIMS, ALL_LANGUAGES, ALL_REPETITIONS,
  MODEL_META, THERAPY_COLOR, LANG_COLOR,
  dimColor, dimLabel,
} from "../config/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","can","it","its","this",
  "that","these","those","they","them","their","he","she","we","you","i",
  "as","by","from","into","through","during","before","after","above","below",
  "if","then","so","such","than","too","very","just","also","not","no","more",
  "which","who","what","when","where","how","all","each","both","few","some",
  "any","most","other","only","same","once","here","there","our","your","el",
  "la","los","las","un","una","unos","unas","del","al","en","de","que","es",
  "por","con","para","como","pero","sin","sobre","entre","ya","se","su","sus",
  "le","les","me","te","nos","les","más","así","todo","esta","este","estos",
]);

const CHIP_COLORS = [
  "#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6",
  "#ec4899","#06b6d4","#84cc16","#f97316","#6366f1",
];

const FONT_OPTIONS = [
  { label: "Georgia", value: "'Georgia', serif" },
  { label: "Helvetica", value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "System", value: "system-ui, sans-serif" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Text utilities — Unicode-safe, supports Spanish
// ─────────────────────────────────────────────────────────────────────────────

// Unicode letter tokenizer — handles accented chars, ñ, etc.
function tokenizeUnicode(text) {
  if (!text) return [];
  // \p{L} matches any Unicode letter — works in modern browsers
  try {
    return [...text.matchAll(/\p{L}+/gu)].map(m => m[0].toLowerCase());
  } catch {
    // Fallback for environments without Unicode property escapes
    return (text.toLowerCase().match(/[a-záéíóúüñàèìòùâêîôûäëïöü]+/g) || []);
  }
}

function wordSet(text) {
  return new Set(tokenizeUnicode(text).filter(w => w.length >= 3 && !STOP_WORDS.has(w)));
}

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

// Compute unique words for this card vs peers
function computeUniqueWords(cardText, peerTexts) {
  const mine   = wordSet(cardText);
  const theirs = new Set(peerTexts.flatMap(t => [...wordSet(t)]));
  return new Set([...mine].filter(w => !theirs.has(w)));
}

// Diff score: % of this card's vocab not in any peer
function diffScore(cardText, peerTexts) {
  const mine = wordSet(cardText);
  if (mine.size === 0) return 0;
  const theirs = new Set(peerTexts.flatMap(t => [...wordSet(t)]));
  const unique = [...mine].filter(w => !theirs.has(w)).length;
  return Math.round((unique / mine.size) * 100);
}

// Unique vocab % = unique words / total vocab
function uniqueVocabPct(cardText, peerTexts) {
  return diffScore(cardText, peerTexts);
}

// Top N meaningful unique terms by frequency
function topUniqueTerms(cardText, peerTexts, n = 6) {
  const tokens = tokenizeUnicode(cardText).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  const theirs = new Set(peerTexts.flatMap(t => [...wordSet(t)]));
  const freq = {};
  tokens.forEach(w => { if (!theirs.has(w)) freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, n).map(([w]) => w);
}

// Suggested keywords: top words by frequency across all visible responses
function suggestedKeywords(responses, n = 8) {
  const freq = {};
  responses.forEach(r => {
    tokenizeUnicode(r).filter(w => w.length >= 4 && !STOP_WORDS.has(w))
      .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  });
  return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, n).map(([w]) => w);
}

// ─────────────────────────────────────────────────────────────────────────────
// HighlightedText — multi-keyword, underline or bg mode, partial/whole word
// ─────────────────────────────────────────────────────────────────────────────

function HighlightedText({ text, keywords, highlightStyle, partialMatch, diffWords, diffColor }) {
  const segments = useMemo(() => {
    if (!text) return [];
    // Split on word boundaries preserving whitespace & punctuation
    const parts = text.split(/(\s+|[^\p{L}]+)/u);
    return parts.map(tok => {
      const clean = tok.toLowerCase().replace(/[^\p{L}]/gu, "");
      if (!clean) return { text: tok, type: "plain" };

      // Check keywords (multi-keyword, each has own color)
      for (const kw of keywords) {
        const kwClean = kw.term.toLowerCase();
        const matches = partialMatch
          ? clean.includes(kwClean)
          : clean === kwClean;
        if (matches) return { text: tok, type: "keyword", color: kw.color };
      }

      // Diff highlight (only if enabled, use card model color)
      if (diffWords && diffWords.has(clean) && clean.length >= 3) {
        return { text: tok, type: "diff", color: diffColor };
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
                outline: `1.5px solid ${seg.color}55`, fontWeight: 600,
                fontStyle: "inherit",
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
// KeywordChips — multi-keyword input system
// ─────────────────────────────────────────────────────────────────────────────

function KeywordChips({ keywords, onAdd, onRemove, onClearAll, suggestions }) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const nextColor = CHIP_COLORS[keywords.length % CHIP_COLORS.length];

  function addKeyword(term) {
    const t = term.trim().toLowerCase();
    if (!t || keywords.some(k => k.term === t)) return;
    onAdd({ term: t, color: CHIP_COLORS[keywords.length % CHIP_COLORS.length] });
    setInput("");
    setShowSuggestions(false);
  }

  function handleKey(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(input);
    }
    if (e.key === "Backspace" && !input && keywords.length > 0) {
      onRemove(keywords[keywords.length - 1].term);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4,
        padding: "4px 8px", border: "1px solid #e5e5e5", borderRadius: 6,
        background: "#fff", minHeight: 34,
      }}>
        {keywords.map(kw => (
          <span key={kw.term} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 12,
            background: kw.color + "20", border: `1px solid ${kw.color}66`,
            color: kw.color, fontSize: 12, fontWeight: 600,
          }}>
            {kw.term}
            <button onClick={() => onRemove(kw.term)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: kw.color, fontSize: 13, lineHeight: 1, padding: 0,
              display: "flex", alignItems: "center",
            }}>×</button>
          </span>
        ))}
        <div style={{ position: "relative", flex: 1, minWidth: 80 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKey}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={keywords.length === 0 ? "Add keyword…" : "+"}
            style={{
              border: "none", outline: "none", fontSize: 12,
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              background: "transparent", color: "#111", width: "100%",
              padding: "2px 4px",
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, zIndex: 400,
              background: "#fff", border: "1px solid #e5e5e5", borderRadius: 4,
              boxShadow: "0 4px 16px rgba(0,0,0,.1)", padding: "6px 0",
              minWidth: 160, marginTop: 2,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
                textTransform: "uppercase", color: "#aaa", padding: "2px 10px 4px" }}>
                Suggested
              </div>
              {suggestions
                .filter(s => !keywords.some(k => k.term === s) && (!input || s.includes(input.toLowerCase())))
                .slice(0, 7)
                .map(s => (
                  <button key={s} onMouseDown={() => addKeyword(s)} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "5px 10px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 12, color: "#333",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  }}
                    onMouseEnter={e => e.target.style.background = "#f5f5f5"}
                    onMouseLeave={e => e.target.style.background = "none"}
                  >{s}</button>
                ))}
            </div>
          )}
        </div>
        {keywords.length > 0 && (
          <button onClick={onClearAll} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: "#aaa", padding: "0 4px",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>Clear all</button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WordCountBar
// ─────────────────────────────────────────────────────────────────────────────

function WordCountBar({ count, maxCount, color }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      padding: "5px 14px 7px", borderTop: "1px solid #f1f1f1", background: "#fafafa" }}>
      <div style={{ flex: 1, height: 3, background: "#e5e5e5", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color + "88",
          borderRadius: 2, transition: "width .3s" }}/>
      </div>
      <span style={{ fontSize: 10, color: "#aaa", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
        {count} words
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopUniqueTermsBadges
// ─────────────────────────────────────────────────────────────────────────────

function TopUniqueTermsBadges({ terms, pct, color }) {
  if (!terms || terms.length === 0) return null;
  return (
    <div style={{ padding: "7px 14px 9px", borderTop: "1px solid #f1f1f1", background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
          textTransform: "uppercase", color: "#aaa" }}>Top unique terms</span>
        <span style={{ fontSize: 10, color, fontWeight: 700,
          background: color + "15", padding: "1px 6px", borderRadius: 8 }}>
          {pct}% unique vocab
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {terms.map(w => (
          <span key={w} style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 2,
            background: color + "15", color, fontWeight: 600, letterSpacing: 0.2,
          }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkbox
// ─────────────────────────────────────────────────────────────────────────────

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12,
      padding: "6px 0", cursor: "pointer",
      fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />
      <span style={{
        width: 18, height: 18, borderRadius: 2, flexShrink: 0,
        border: `1.5px solid ${checked ? "#111" : "#bbb"}`,
        background: checked ? "#111" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .12s",
      }}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <span style={{ fontSize: 14, color: "#111", fontWeight: 400, flex: 1, letterSpacing: 0.1 }}>
        {label}
      </span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AccordionSection
// ─────────────────────────────────────────────────────────────────────────────

function AccordionSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid #e5e5e5" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "16px 0",
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111",
          letterSpacing: 0.2, padding: "2px 0" }}>{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#111" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SortByDropdown
// ─────────────────────────────────────────────────────────────────────────────

function SortByDropdown({ colDim, rowDim, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const options = [null, ...ALL_DIMS.map(d => d.id)];
  function optLabel(dim) {
    if (!dim) return "None";
    return ALL_DIMS.find(d => d.id === dim)?.label || dim;
  }
  function OptionButtons({ activeDim, blockedDim, onPick }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(opt => {
          const active = activeDim === opt;
          const disabled = opt !== null && opt === blockedDim;
          return (
            <button key={String(opt)} disabled={disabled} onClick={() => onPick(opt)} style={{
              padding: "5px 12px", borderRadius: 2,
              border: `1.5px solid ${active ? "#111" : "#e5e5e5"}`,
              background: active ? "#111" : "#fff",
              color: active ? "#fff" : disabled ? "#ccc" : "#111",
              fontSize: 12, fontWeight: active ? 600 : 400,
              cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}>{optLabel(opt)}</button>
          );
        })}
      </div>
    );
  }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: 0, background: "none", border: "none",
        fontSize: 13, fontWeight: 500, color: "#555", cursor: "pointer",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        Sort By
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="3"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 400,
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 4,
          boxShadow: "0 8px 32px rgba(0,0,0,.1)", padding: "18px 18px 14px", minWidth: 260,
        }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
              textTransform: "uppercase", color: "#aaa", marginBottom: 8 }}>Columns</div>
            <OptionButtons activeDim={colDim} blockedDim={rowDim} onPick={v => onChange(v, rowDim)}/>
          </div>
          <div style={{ borderTop: "1px solid #f1f1f1", paddingTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
              textTransform: "uppercase", color: "#aaa", marginBottom: 8 }}>Rows</div>
            <OptionButtons activeDim={rowDim} blockedDim={colDim} onPick={v => onChange(colDim, v)}/>
          </div>
          <div style={{ borderTop: "1px solid #f1f1f1", marginTop: 12, paddingTop: 8,
            fontSize: 11, color: "#aaa" }}>
            {optLabel(colDim)} cols × {optLabel(rowDim)} rows
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ToolbarButton — subtle toggle pill
// ─────────────────────────────────────────────────────────────────────────────

function ToolbarBtn({ active, onClick, children, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 3,
      border: `1px solid ${active ? "#555" : "#ddd"}`,
      background: active ? "#f0f0f0" : "#fff",
      color: active ? "#111" : "#666",
      fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      letterSpacing: 0.2, transition: "all .12s",
    }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisToolbar
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisToolbar({
  showDiff, setShowDiff,
  showWordCount, setShowWordCount,
  showKeywords, setShowKeywords,
  showUniqueBadges, setShowUniqueBadges,
  partialMatch, setPartialMatch,
  highlightStyle, setHighlightStyle,
  fontSize, setFontSize,
  fontFamily, setFontFamily,
  showFilters, setShowFilters,
  colDim, rowDim, onAxisChange,
}) {
  return (
    <div style={{
      background: "#fff", borderBottom: "1px solid #e5e5e5",
      padding: "0 24px", display: "flex", alignItems: "center",
      height: 40, gap: 2, flexWrap: "nowrap", overflow: "hidden",
      position: "sticky", top: 96, zIndex: 198,
    }}>
      {/* Groups separated by thin dividers */}
      <ToolbarBtn active={showDiff} onClick={() => setShowDiff(d => !d)} title="Diff mode">
        ◈ Diff
      </ToolbarBtn>
      {showDiff && (
        <ToolbarBtn active={showUniqueBadges} onClick={() => setShowUniqueBadges(b => !b)} title="Show unique term badges">
          Badges
        </ToolbarBtn>
      )}

      <div style={{ width: 1, height: 18, background: "#e5e5e5", margin: "0 6px", flexShrink: 0 }}/>

      <ToolbarBtn active={showWordCount} onClick={() => setShowWordCount(w => !w)} title="Show word count">
        Word Count
      </ToolbarBtn>

      <div style={{ width: 1, height: 18, background: "#e5e5e5", margin: "0 6px", flexShrink: 0 }}/>

      <ToolbarBtn active={showKeywords} onClick={() => setShowKeywords(k => !k)} title="Keyword highlighting">
        🏷 Keywords
      </ToolbarBtn>

      {/* Match mode (only visible when relevant) */}
      {showKeywords && (
        <>
          <div style={{ width: 1, height: 18, background: "#e5e5e5", margin: "0 4px", flexShrink: 0 }}/>
          <ToolbarBtn active={!partialMatch} onClick={() => setPartialMatch(false)} title="Whole word match">
            Whole
          </ToolbarBtn>
          <ToolbarBtn active={partialMatch} onClick={() => setPartialMatch(true)} title="Partial match">
            Partial
          </ToolbarBtn>
        </>
      )}

      <div style={{ width: 1, height: 18, background: "#e5e5e5", margin: "0 6px", flexShrink: 0 }}/>

      {/* Highlight style */}
      <ToolbarBtn active={highlightStyle === "fill"} onClick={() => setHighlightStyle("fill")} title="Fill highlight">
        ▮ Fill
      </ToolbarBtn>
      <ToolbarBtn active={highlightStyle === "underline"} onClick={() => setHighlightStyle("underline")} title="Underline highlight">
        U̲ Line
      </ToolbarBtn>

      <div style={{ width: 1, height: 18, background: "#e5e5e5", margin: "0 6px", flexShrink: 0 }}/>

      {/* Font family */}
      <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={{
        fontSize: 11, border: "1px solid #ddd", borderRadius: 3, padding: "2px 4px",
        color: "#555", background: "#fff", cursor: "pointer", outline: "none",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        {FONT_OPTIONS.map(f => (
          <option key={f.label} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{
        fontSize: 11, border: "1px solid #ddd", borderRadius: 3, padding: "2px 4px",
        color: "#555", background: "#fff", cursor: "pointer", outline: "none",
        fontFamily: "'Helvetica Neue', Arial, sans-serif", marginLeft: 2,
      }}>
        {[11,12,13,14,15,16].map(s => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>

      {/* Right side */}
      <div style={{ flex: 1 }}/>

      <button onClick={() => setShowFilters(f => !f)} style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "none", border: "none", cursor: "pointer",
        fontSize: 12, fontWeight: 500, color: "#666",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        {showFilters ? "Hide Filters" : "Show Filters"}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="#666"/>
          <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="#666"/>
          <line x1="4" y1="18" x2="20" y2="18"/><circle cx="10" cy="18" r="2" fill="#666"/>
        </svg>
      </button>

      <div style={{ width: 1, height: 18, background: "#e5e5e5", margin: "0 8px", flexShrink: 0 }}/>
      <SortByDropdown colDim={colDim} rowDim={rowDim} onChange={onAxisChange}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResponseCard
// ─────────────────────────────────────────────────────────────────────────────

function ResponseCard({
  model, language, therapy, repetition, response,
  showWordCount, maxWordCount,
  showDiff, diffWords, diffScoreValue, uniqueVocabValue,
  showUniqueBadges, topTerms,
  keywords, highlightStyle, partialMatch,
  fontSize, fontFamily,
}) {
  const mc = MODEL_META[model]?.color || "#111";
  const ml = MODEL_META[model]?.label || model;
  const lc = LANG_COLOR[language]     || "#111";
  const tc = THERAPY_COLOR[therapy]   || "#111";
  const wc = wordCount(response);

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e5e5", borderRadius: 4,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 1px 4px rgba(0,0,0,.05)", minWidth: 0,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
        borderBottom: "1px solid #f1f1f1", background: "#fafafa", flexWrap: "wrap" }}>
        <span style={{ width: 3, height: 14, borderRadius: 1, background: mc, flexShrink: 0 }}/>
        <span style={{ fontSize: 11, fontWeight: 700, color: mc, letterSpacing: 0.3 }}>{ml}</span>
        <span style={{ color: "#ddd", fontSize: 10 }}>·</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: lc }}>{language}</span>
        <span style={{ color: "#ddd", fontSize: 10 }}>·</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 2,
          background: tc + "18", color: tc }}>{therapy}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#bbb" }}>Rep {repetition}</span>

        {/* Metrics */}
        {showWordCount && (
          <span style={{ fontSize: 10, color: "#888", background: "#f0f0f0",
            padding: "1px 6px", borderRadius: 8, marginLeft: 4 }}>
            {wc}w
          </span>
        )}
        {showDiff && diffScoreValue !== undefined && (
          <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff",
            padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}
            title="% of this card's vocabulary not found in column peers">
            Diff {diffScoreValue}%
          </span>
        )}
        {showDiff && uniqueVocabValue !== undefined && (
          <span style={{ fontSize: 10, color: "#6b7280", background: "#f9fafb",
            padding: "1px 6px", borderRadius: 8 }}>
            Unique {uniqueVocabValue}%
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{
        padding: "14px 16px", fontSize: fontSize, lineHeight: 1.85, color: "#333",
        whiteSpace: "pre-wrap", overflowY: "auto", maxHeight: 520,
        fontFamily: fontFamily, flex: 1,
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

      {/* Top unique terms badges */}
      {showDiff && showUniqueBadges && topTerms && topTerms.length > 0 && (
        <TopUniqueTermsBadges terms={topTerms} pct={uniqueVocabValue} color={mc} />
      )}

      {/* Word count bar */}
      {showWordCount && response && (
        <WordCountBar count={wc} maxCount={maxWordCount} color={mc} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function HCCExplorer({ data }) {

  const questions = useMemo(() => {
    const seen = new Map();
    data.forEach(r => { if (!seen.has(r.q_num)) seen.set(r.q_num, r.topic); });
    return [...seen.entries()].sort(([a],[b]) => a.localeCompare(b))
      .map(([q_num, topic]) => ({ q_num, topic }));
  }, [data]);

  const allModels = useMemo(() => [...new Set(data.map(r => r.model))].sort(), [data]);

  // Filter state
  const [selQ,         setSelQ]         = useState("Q1");
  const [selTherapies, setSelTherapies] = useState(["General"]);
  const [selLangs,     setSelLangs]     = useState(["English", "Spanish"]);
  const [selModels,    setSelModels]    = useState([]);
  const [selReps,      setSelReps]      = useState([1]);
  const [showFilters,  setShowFilters]  = useState(true);
  const [colDim,       setColDim]       = useState("model");
  const [rowDim,       setRowDim]       = useState("language");

  // Analysis toolbar state
  const [showDiff,         setShowDiff]         = useState(false);
  const [showUniqueBadges, setShowUniqueBadges] = useState(false);
  const [showWordCount,    setShowWordCount]    = useState(false);
  const [showKeywords,     setShowKeywords]     = useState(false);
  const [keywords,         setKeywords]         = useState([]);
  const [highlightStyle,   setHighlightStyle]   = useState("fill");
  const [partialMatch,     setPartialMatch]     = useState(false);
  const [fontSize,         setFontSize]         = useState(13);
  const [fontFamily,       setFontFamily]       = useState("'Georgia', serif");

  useEffect(() => {
    if (data.length === 0) return;
    const firstQ = [...new Set(data.map(r => r.q_num))].sort()[0];
    const models = [...new Set(data.map(r => r.model))].sort();
    const firstQTherapies = [...new Set(data.filter(r => r.q_num === firstQ).map(r => r.therapy))].sort();
    setSelQ(firstQ);
    setSelModels(models);
    setSelTherapies(firstQTherapies);
  }, [data]);

  const availTherapies = useMemo(
    () => [...new Set(data.filter(r => r.q_num === selQ).map(r => r.therapy))].sort(),
    [data, selQ]
  );

  const currentTopic = questions.find(q => q.q_num === selQ)?.topic ?? selQ;
  const therapyLabel = selTherapies.length === 1 ? selTherapies[0]
                     : selTherapies.length === availTherapies.length ? "All Therapies"
                     : `${selTherapies.length} Therapies`;

  function handleQSelect(q) {
    setSelQ(q);
    const t = [...new Set(data.filter(r => r.q_num === q).map(r => r.therapy))].sort();
    setSelTherapies(t);
  }

  function toggle(val, setter) {
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  function handleAxisChange(newCol, newRow) {
    if (newCol !== null && newCol === newRow) return;
    setColDim(newCol);
    setRowDim(newRow);
  }

  function addKeyword(kw) { setKeywords(prev => [...prev, kw]); }
  function removeKeyword(term) { setKeywords(prev => prev.filter(k => k.term !== term)); }
  function clearKeywords() { setKeywords([]); }

  const selValues = {
    therapy:    selTherapies,
    language:   selLangs,
    model:      selModels,
    repetition: selReps,
  };

  const promptText = useMemo(() => {
    const r = data.find(rec =>
      rec.q_num === selQ &&
      selTherapies.includes(rec.therapy) &&
      selLangs.includes(rec.language)
    );
    return r?.prompt ?? "";
  }, [data, selQ, selTherapies, selLangs]);

  function getResponse({ therapy, language, model, repetition }) {
    return data.find(r =>
      r.q_num      === selQ    &&
      r.therapy    === therapy &&
      r.language   === language &&
      r.model      === model   &&
      r.repetition === repetition
    )?.response ?? null;
  }

  const freeDims = ALL_DIMS.map(d => d.id).filter(d => d !== colDim && d !== rowDim);

  const freeCombos = useMemo(() => {
    let result = [{}];
    freeDims.forEach(dim => {
      result = result.flatMap(c => selValues[dim].map(v => ({ ...c, [dim]: v })));
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selTherapies, selLangs, selModels, selReps, colDim, rowDim]);

  const effectiveCols  = colDim ? selValues[colDim] : [null];
  const effectiveRows  = rowDim ? selValues[rowDim] : [null];
  const showColHeaders = !!colDim;
  const showRowLabels  = !!rowDim;
  const rowLabelWidth  = showRowLabels ? 120 : 0;

  // NAV: topbar(48) + explorerbar(48) + toolbar(40) = 136
  const NAV_HEIGHT = 136;

  // Max word count for bars
  const maxWordCount = useMemo(() => {
    let max = 1;
    effectiveRows.forEach(rowVal => {
      effectiveCols.forEach(colVal => {
        freeCombos.forEach(freeCombo => {
          const full = { ...freeCombo };
          if (colDim && colVal !== null) full[colDim] = colVal;
          if (rowDim && rowVal !== null) full[rowDim] = rowVal;
          ALL_DIMS.forEach(({ id }) => { if (full[id] === undefined) full[id] = selValues[id][0]; });
          const wc = wordCount(getResponse(full));
          if (wc > max) max = wc;
        });
      });
    });
    return max;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selTherapies, selLangs, selModels, selReps, colDim, rowDim, selQ]);

  // Peer responses for diff (all other rowVals in same col)
  function getPeerResponses(colVal, rowVal) {
    const peers = [];
    effectiveRows.forEach(rv => {
      if (String(rv) === String(rowVal)) return;
      freeCombos.forEach(freeCombo => {
        const full = { ...freeCombo };
        if (colDim && colVal !== null) full[colDim] = colVal;
        if (rowDim && rv !== null) full[rowDim] = rv;
        ALL_DIMS.forEach(({ id }) => { if (full[id] === undefined) full[id] = selValues[id][0]; });
        const resp = getResponse(full);
        if (resp) peers.push(resp);
      });
    });
    return peers;
  }

  // All visible responses (for suggested keywords)
  const allVisibleResponses = useMemo(() => {
    const resps = [];
    effectiveRows.forEach(rowVal => {
      effectiveCols.forEach(colVal => {
        freeCombos.forEach(freeCombo => {
          const full = { ...freeCombo };
          if (colDim && colVal !== null) full[colDim] = colVal;
          if (rowDim && rowVal !== null) full[rowDim] = rowVal;
          ALL_DIMS.forEach(({ id }) => { if (full[id] === undefined) full[id] = selValues[id][0]; });
          const r = getResponse(full);
          if (r) resps.push(r);
        });
      });
    });
    return resps;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selTherapies, selLangs, selModels, selReps, colDim, rowDim, selQ]);

  const suggestions = useMemo(
    () => suggestedKeywords(allVisibleResponses, 10).filter(s => !keywords.some(k => k.term === s)),
    [allVisibleResponses, keywords]
  );

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#f5f5f5", minHeight: "100vh", color: "#111" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e5e5",
        padding: "0 32px", display: "flex", alignItems: "center", height: 48,
        position: "sticky", top: 0, zIndex: 200,
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: 0.5, marginRight: 40 }}>
          KGRT Lab
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 28, flex: 1 }}>
          {["About", "Background", "Abstract", "HCC Responses"].map(link => (
            <a key={link} href="#" style={{
              fontSize: 14, fontWeight: 500, color: "#111",
              textDecoration: "none", letterSpacing: 0.2,
              borderBottom: link === "HCC Responses" ? "2px solid #111" : "2px solid transparent",
              paddingBottom: 2,
            }} onClick={e => e.preventDefault()}>{link}</a>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "#8d8d8d" }}>HCC Patient Education Study</span>
      </div>

      {/* ── Breadcrumb bar ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #ebebeb",
        padding: "0 32px", display: "flex", alignItems: "center", height: 48,
        position: "sticky", top: 48, zIndex: 199,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "#8d8d8d", flex: 1 }}>
          <span style={{ color: "#111", fontWeight: 600 }}>HCC Responses</span>
          <span>/</span><span>{selQ}</span>
          <span>/</span><span>{currentTopic}</span>
          <span>/</span>
          <span style={{ color: "#111", fontWeight: 500 }}>{therapyLabel}</span>
        </div>
      </div>

      {/* ── Analysis Toolbar ── */}
      <AnalysisToolbar
        showDiff={showDiff} setShowDiff={setShowDiff}
        showWordCount={showWordCount} setShowWordCount={setShowWordCount}
        showKeywords={showKeywords} setShowKeywords={setShowKeywords}
        showUniqueBadges={showUniqueBadges} setShowUniqueBadges={setShowUniqueBadges}
        partialMatch={partialMatch} setPartialMatch={setPartialMatch}
        highlightStyle={highlightStyle} setHighlightStyle={setHighlightStyle}
        fontSize={fontSize} setFontSize={setFontSize}
        fontFamily={fontFamily} setFontFamily={setFontFamily}
        showFilters={showFilters} setShowFilters={setShowFilters}
        colDim={colDim} rowDim={rowDim} onAxisChange={handleAxisChange}
      />

      {/* ── Keyword input bar (shown when keywords panel open) ── */}
      {showKeywords && (
        <div style={{
          background: "#fafafa", borderBottom: "1px solid #e5e5e5",
          padding: "10px 32px", position: "sticky", top: 136, zIndex: 197,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", color: "#aaa", paddingTop: 8, whiteSpace: "nowrap" }}>
              Keywords
            </div>
            <div style={{ flex: 1 }}>
              <KeywordChips
                keywords={keywords}
                onAdd={addKeyword}
                onRemove={removeKeyword}
                onClearAll={clearKeywords}
                suggestions={suggestions}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{
        display: "flex",
        height: `calc(100vh - ${NAV_HEIGHT}px - ${showKeywords ? 56 : 0}px)`,
      }}>

        {/* ── Sidebar ── */}
        {showFilters && (
          <div style={{
            width: 256, flexShrink: 0, background: "#fff",
            borderRight: "1px solid #e5e5e5", overflowY: "auto",
            padding: "24px 22px 32px",
          }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                textTransform: "uppercase", color: "#aaa", marginBottom: 14 }}>
                Question
              </div>
              {questions.map(({ q_num, topic }) => {
                const active = selQ === q_num;
                return (
                  <button key={q_num} onClick={() => handleQSelect(q_num)} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "7px 0",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 400, color: "#111",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    borderBottom: "none", marginBottom: 2, letterSpacing: 0.1,
                    textDecoration: active ? "underline" : "none", textUnderlineOffset: 3,
                  }}>
                    <span style={{ fontSize: 10, color: "#aaa", marginRight: 6 }}>{q_num}</span>
                    <span style={{ fontWeight: active ? 700 : 400 }}>{topic}</span>
                  </button>
                );
              })}
            </div>

            <AccordionSection title="Therapy">
              {availTherapies.map(val => (
                <Checkbox key={val} checked={selTherapies.includes(val)}
                  onChange={() => toggle(val, setSelTherapies)} label={val} />
              ))}
            </AccordionSection>
            <AccordionSection title="Language">
              {ALL_LANGUAGES.map(val => (
                <Checkbox key={val} checked={selLangs.includes(val)}
                  onChange={() => toggle(val, setSelLangs)} label={val} />
              ))}
            </AccordionSection>
            <AccordionSection title="Model">
              {allModels.map(val => (
                <Checkbox key={val} checked={selModels.includes(val)}
                  onChange={() => toggle(val, setSelModels)}
                  label={MODEL_META[val]?.label ?? val} />
              ))}
            </AccordionSection>
            <AccordionSection title="Repetition">
              {ALL_REPETITIONS.map(val => (
                <Checkbox key={val} checked={selReps.includes(val)}
                  onChange={() => toggle(val, setSelReps)} label={`Rep ${val}`} />
              ))}
            </AccordionSection>
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", minWidth: 0 }}>

          {/* Prompt */}
          {promptText && (
            <div style={{
              background: "#fff", border: "1px solid #e5e5e5", borderLeft: "3px solid #111",
              padding: "10px 16px", marginBottom: 20, borderRadius: 2,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                textTransform: "uppercase", color: "#aaa", marginBottom: 4 }}>Prompt</div>
              <div style={{ fontSize: 13, color: "#333", fontStyle: "italic", lineHeight: 1.6 }}>
                <HighlightedText
                  text={promptText}
                  keywords={keywords}
                  highlightStyle={highlightStyle}
                  partialMatch={partialMatch}
                />
              </div>
            </div>
          )}

          {/* Column headers */}
          {showColHeaders && (
            <div style={{
              display: "grid",
              gridTemplateColumns: `${rowLabelWidth ? rowLabelWidth + "px " : ""}repeat(${effectiveCols.length}, 1fr)`,
              gap: 10, marginBottom: 8,
            }}>
              {rowLabelWidth > 0 && <div/>}
              {effectiveCols.map(colVal => (
                <div key={String(colVal)} style={{
                  padding: "7px 12px", background: "#fff",
                  borderTop: `2px solid ${colDim ? dimColor(colDim, colVal) : "#111"}`,
                  border: "1px solid #e5e5e5", borderRadius: 2, textAlign: "center",
                  fontSize: 12, fontWeight: 700,
                  color: colDim ? dimColor(colDim, colVal) : "#111",
                }}>
                  {colDim ? dimLabel(colDim, colVal) : ""}
                </div>
              ))}
            </div>
          )}

          {/* Rows */}
          {effectiveRows.map(rowVal => (
            <div key={String(rowVal)} style={{
              display: "grid",
              gridTemplateColumns: `${rowLabelWidth ? rowLabelWidth + "px " : ""}repeat(${effectiveCols.length}, 1fr)`,
              gap: 10, marginBottom: 14, alignItems: "start",
            }}>
              {showRowLabels && (
                <div style={{ paddingRight: 12, paddingTop: 10, borderRight: "1px solid #e5e5e5" }}>
                  <span style={{ fontSize: 12, fontWeight: 700,
                    color: rowDim ? dimColor(rowDim, rowVal) : "#111" }}>
                    {rowDim ? dimLabel(rowDim, rowVal) : ""}
                  </span>
                </div>
              )}

              {effectiveCols.map(colVal => {
                const cellCards = freeCombos.map(freeCombo => {
                  const full = { ...freeCombo };
                  if (colDim && colVal !== null) full[colDim] = colVal;
                  if (rowDim && rowVal !== null) full[rowDim] = rowVal;
                  ALL_DIMS.forEach(({ id }) => {
                    if (full[id] === undefined) full[id] = selValues[id][0];
                  });
                  full.response = getResponse(full);
                  return full;
                });

                const colPeers = getPeerResponses(colVal, rowVal);

                return (
                  <div key={String(colVal)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {cellCards.map((card, k) => {
                      const allPeers = [
                        ...colPeers,
                        ...cellCards.filter((_, ki) => ki !== k).map(c => c.response).filter(Boolean),
                      ];
                      const dWords  = showDiff ? computeUniqueWords(card.response, allPeers) : null;
                      const dScore  = showDiff ? diffScore(card.response, allPeers) : undefined;
                      const uVocab  = showDiff ? uniqueVocabPct(card.response, allPeers) : undefined;
                      const tTerms  = (showDiff && showUniqueBadges)
                        ? topUniqueTerms(card.response, allPeers, 6) : null;

                      return (
                        <ResponseCard key={k}
                          model={card.model} language={card.language}
                          therapy={card.therapy} repetition={card.repetition}
                          response={card.response}
                          showWordCount={showWordCount}
                          maxWordCount={maxWordCount}
                          showDiff={showDiff}
                          diffWords={dWords}
                          diffScoreValue={dScore}
                          uniqueVocabValue={uVocab}
                          showUniqueBadges={showUniqueBadges}
                          topTerms={tTerms}
                          keywords={keywords}
                          highlightStyle={highlightStyle}
                          partialMatch={partialMatch}
                          fontSize={fontSize}
                          fontFamily={fontFamily}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
