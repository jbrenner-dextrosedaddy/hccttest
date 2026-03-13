// src/components/HCCExplorer.jsx

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ALL_DIMS, ALL_LANGUAGES, ALL_REPETITIONS,
  MODEL_META, THERAPY_COLOR, LANG_COLOR,
  dimColor, dimLabel,
} from "../config/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Text utilities
// ─────────────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","can","it","its","this",
  "that","these","those","they","them","their","he","she","we","you","i",
  "as","by","from","into","through","during","before","after","above","below",
  "if","then","so","such","than","too","very","just","also","not","no","more",
  "which","who","what","when","where","how","all","each","both","few","some",
  "any","most","other","only","same","once","here","there","its","our","your",
]);

function tokenize(text) {
  return (text || "").toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
}

function wordSet(text) {
  return new Set(tokenize(text).filter(w => !STOP_WORDS.has(w)));
}

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function computeUniqueWords(cardResponse, peerResponses) {
  const mine   = wordSet(cardResponse);
  const theirs = new Set(peerResponses.flatMap(r => [...wordSet(r)]));
  return new Set([...mine].filter(w => !theirs.has(w)));
}

// ─────────────────────────────────────────────────────────────────────────────
// HighlightedText
// ─────────────────────────────────────────────────────────────────────────────

function HighlightedText({ text, highlightWords, diffColor, searchTerm }) {
  const segments = useMemo(() => {
    if (!text) return [];
    return text.split(/(\s+)/).map(tok => {
      const clean = tok.toLowerCase().replace(/[^a-z]/g, "");
      // Search wins
      if (searchTerm && clean && clean.includes(searchTerm)) {
        return { text: tok, bg: "#FFD600", color: "#111", bold: true };
      }
      // Diff
      if (highlightWords && clean.length >= 3 && highlightWords.has(clean)) {
        return { text: tok, bg: diffColor + "35", color: diffColor, bold: true, outline: `1px solid ${diffColor}66` };
      }
      return { text: tok, bg: null };
    });
  }, [text, highlightWords, diffColor, searchTerm]);

  return (
    <span>
      {segments.map((seg, i) =>
        seg.bg ? (
          <mark key={i} style={{
            background: seg.bg, color: seg.color || "#111",
            borderRadius: 2, padding: "0 1px",
            outline: seg.outline || "none",
            fontWeight: seg.bold ? 700 : 400,
            fontStyle: "inherit",
          }}>{seg.text}</mark>
        ) : <span key={i}>{seg.text}</span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WordCountBar
// ─────────────────────────────────────────────────────────────────────────────

function WordCountBar({ count, maxCount, color }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      padding: "6px 14px 8px", borderTop: "1px solid #f1f1f1", background: "#fafafa" }}>
      <div style={{ flex: 1, height: 4, background: "#e5e5e5", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color,
          borderRadius: 2, transition: "width .3s" }}/>
      </div>
      <span style={{ fontSize: 10, color: "#8d8d8d", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
        {count} words
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UniqueBadges
// ─────────────────────────────────────────────────────────────────────────────

function UniqueBadges({ uniqueWords, color }) {
  if (!uniqueWords || uniqueWords.size === 0) return null;
  const words = [...uniqueWords].slice(0, 14);
  return (
    <div style={{ padding: "8px 14px 10px", borderTop: "1px solid #f1f1f1", background: "#fafafa" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
        textTransform: "uppercase", color: "#aaa", marginBottom: 5 }}>
        Unique terms
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {words.map(w => (
          <span key={w} style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 2,
            background: color + "18", color, fontWeight: 600, letterSpacing: 0.2,
          }}>{w}</span>
        ))}
        {uniqueWords.size > 14 && (
          <span style={{ fontSize: 10, color: "#aaa", alignSelf: "center" }}>
            +{uniqueWords.size - 14} more
          </span>
        )}
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
          letterSpacing: 0.2, padding: "2px 0" }}>
          {title}
        </span>
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
          const active   = activeDim === opt;
          const disabled = opt !== null && opt === blockedDim;
          return (
            <button key={String(opt)} disabled={disabled} onClick={() => onPick(opt)} style={{
              padding: "6px 14px", borderRadius: 2,
              border: `1.5px solid ${active ? "#111" : "#e5e5e5"}`,
              background: active ? "#111" : "#fff",
              color: active ? "#fff" : disabled ? "#ccc" : "#111",
              fontSize: 13, fontWeight: active ? 600 : 400,
              cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: "'Helvetica Neue', Arial, sans-serif", letterSpacing: 0.2,
            }}>{optLabel(opt)}</button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: 0, background: "none", border: "none",
        fontSize: 14, fontWeight: 500, color: "#111", cursor: "pointer",
        fontFamily: "'Helvetica Neue', Arial, sans-serif", letterSpacing: 0.2,
      }}>
        Sort By
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 10px)", zIndex: 300,
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 4,
          boxShadow: "0 8px 32px rgba(0,0,0,.12)", padding: "20px 20px 16px", minWidth: 280,
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: "uppercase", color: "#8d8d8d", marginBottom: 10 }}>Columns</div>
            <OptionButtons activeDim={colDim} blockedDim={rowDim} onPick={v => onChange(v, rowDim)}/>
          </div>
          <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: "uppercase", color: "#8d8d8d", marginBottom: 10 }}>Rows</div>
            <OptionButtons activeDim={rowDim} blockedDim={colDim} onPick={v => onChange(colDim, v)}/>
          </div>
          <div style={{ borderTop: "1px solid #e5e5e5", marginTop: 14, paddingTop: 10,
            fontSize: 12, color: "#8d8d8d", letterSpacing: 0.2 }}>
            {optLabel(colDim)} columns × {optLabel(rowDim)} rows
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TogglePill
// ─────────────────────────────────────────────────────────────────────────────

function TogglePill({ active, onClick, children, activeColor = "#111" }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 11px", borderRadius: 20,
      border: `1.5px solid ${active ? activeColor : "#ddd"}`,
      background: active ? activeColor : "#fff",
      color: active ? "#fff" : "#666",
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      letterSpacing: 0.3, transition: "all .14s",
    }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResponseCard
// ─────────────────────────────────────────────────────────────────────────────

function ResponseCard({
  model, language, therapy, repetition, response,
  showWordCount, maxWordCount,
  showDiff, uniqueWords,
  showUniqueBadges,
  searchTerm,
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
      boxShadow: "0 1px 4px rgba(0,0,0,.06)", minWidth: 0,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
        borderBottom: "1px solid #f1f1f1", background: "#fafafa", flexWrap: "wrap" }}>
        <span style={{ width: 3, height: 16, borderRadius: 1, background: mc, flexShrink: 0 }}/>
        <span style={{ fontSize: 11, fontWeight: 700, color: mc, letterSpacing: 0.3 }}>{ml}</span>
        <span style={{ color: "#ddd" }}>·</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: lc }}>{language}</span>
        <span style={{ color: "#ddd" }}>·</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 2,
          background: tc + "18", color: tc }}>{therapy}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#aaa", letterSpacing: 0.3 }}>
          Rep {repetition}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px", fontSize: 13.5, lineHeight: 1.85, color: "#333",
        whiteSpace: "pre-wrap", overflowY: "auto", maxHeight: 500,
        fontFamily: "'Georgia', serif", flex: 1 }}>
        {response
          ? <HighlightedText
              text={response}
              highlightWords={showDiff ? uniqueWords : null}
              diffColor={mc}
              searchTerm={searchTerm || ""}
            />
          : <span style={{ color: "#bbb", fontStyle: "italic" }}>No data for this combination</span>
        }
      </div>

      {/* Unique badges */}
      {showDiff && showUniqueBadges && (
        <UniqueBadges uniqueWords={uniqueWords} color={mc} />
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

  // Feature toggles
  const [showWordCount,    setShowWordCount]    = useState(false);
  const [showDiff,         setShowDiff]         = useState(false);
  const [showUniqueBadges, setShowUniqueBadges] = useState(false);
  const [searchInput,      setSearchInput]      = useState("");
  const [searchTerm,       setSearchTerm]       = useState("");

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

  function handleSearch(e) {
    e.preventDefault();
    setSearchTerm(searchInput.trim().toLowerCase());
  }

  function clearSearch() {
    setSearchTerm("");
    setSearchInput("");
  }

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
  const NAV_HEIGHT     = 96;

  // Max word count across all visible cards (for bar scaling)
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

  // For diff: all responses in same col (same colVal) grouped by rowVal
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

  // Extra info bars height
  const extraBars = (searchTerm ? 37 : 0) + (showDiff ? 37 : 0);

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

      {/* ── Explorer bar ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e5e5",
        padding: "0 16px 0 32px", display: "flex", alignItems: "center", height: 48,
        position: "sticky", top: 48, zIndex: 199, gap: 12,
      }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "#8d8d8d", flexShrink: 0 }}>
          <span style={{ color: "#111", fontWeight: 600 }}>HCC Responses</span>
          <span>/</span><span>{selQ}</span>
          <span>/</span><span>{currentTopic}</span>
          <span>/</span>
          <span style={{ color: "#111", fontWeight: 500 }}>{therapyLabel}</span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "#e5e5e5", flexShrink: 0 }}/>

        {/* Feature toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "nowrap" }}>

          <TogglePill active={showDiff} onClick={() => setShowDiff(d => !d)} activeColor="#7c3aed">
            ◈ Diff
          </TogglePill>

          {showDiff && (
            <TogglePill active={showUniqueBadges} onClick={() => setShowUniqueBadges(b => !b)} activeColor="#7c3aed">
              + Badges
            </TogglePill>
          )}

          <TogglePill active={showWordCount} onClick={() => setShowWordCount(w => !w)} activeColor="#0284c7">
            ▬ Length
          </TogglePill>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 2 }}>
            <div style={{
              display: "flex", alignItems: "center",
              border: `1.5px solid ${searchTerm ? "#f59e0b" : "#ddd"}`,
              borderRadius: 20, overflow: "hidden", background: "#fff",
            }}>
              <span style={{ padding: "0 8px 0 12px", color: "#aaa", fontSize: 13 }}>🔍</span>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Highlight keyword…"
                style={{
                  border: "none", outline: "none", padding: "4px 4px 4px 0",
                  fontSize: 12, fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  width: 150, background: "transparent", color: "#111",
                }}
              />
              {(searchInput || searchTerm) && (
                <button type="button" onClick={clearSearch} style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "0 10px", color: "#bbb", fontSize: 16, lineHeight: 1,
                }}>×</button>
              )}
            </div>
            <button type="submit" style={{
              padding: "4px 12px", borderRadius: 20,
              border: "1.5px solid #ddd", background: "#fff",
              fontSize: 12, cursor: "pointer", color: "#111",
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: 500,
            }}>Go</button>
          </form>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
          <button onClick={() => setShowFilters(f => !f)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 500, color: "#111",
            fontFamily: "'Helvetica Neue', Arial, sans-serif", letterSpacing: 0.2,
          }}>
            {showFilters ? "Hide Filters" : "Show Filters"}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="#111"/>
              <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="#111"/>
              <line x1="4" y1="18" x2="20" y2="18"/><circle cx="10" cy="18" r="2" fill="#111"/>
            </svg>
          </button>
          <SortByDropdown colDim={colDim} rowDim={rowDim} onChange={handleAxisChange}/>
        </div>
      </div>

      {/* ── Search hint bar ── */}
      {searchTerm && (
        <div style={{
          background: "#fffbeb", borderBottom: "1px solid #fde68a",
          padding: "0 32px", height: 37, display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, color: "#92400e",
        }}>
          <span style={{ fontWeight: 700 }}>Highlighting:</span>
          <span style={{ background: "#FFD600", color: "#111", padding: "1px 8px",
            borderRadius: 2, fontWeight: 700 }}>{searchTerm}</span>
          <span>in all visible cards</span>
          <button onClick={clearSearch} style={{ marginLeft: "auto", background: "none",
            border: "none", cursor: "pointer", fontSize: 12, color: "#92400e", fontWeight: 600 }}>
            Clear ×
          </button>
        </div>
      )}

      {/* ── Diff legend bar ── */}
      {showDiff && (
        <div style={{
          background: "#faf5ff", borderBottom: "1px solid #e9d5ff",
          padding: "0 32px", height: 37, display: "flex", alignItems: "center",
          gap: 16, fontSize: 12, color: "#6b21a8", flexWrap: "wrap",
        }}>
          <span style={{ fontWeight: 700 }}>◈ Diff on</span>
          <span>— highlighted words are unique to each card vs its column peers</span>
          {allModels.map(m => (
            <span key={m} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 2, display: "inline-block",
                background: (MODEL_META[m]?.color || "#111") + "35",
                border: `1px solid ${MODEL_META[m]?.color || "#111"}`,
              }}/>
              <span style={{ color: MODEL_META[m]?.color || "#111", fontWeight: 600 }}>
                {MODEL_META[m]?.label || m}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display: "flex", height: `calc(100vh - ${NAV_HEIGHT + extraBars}px)` }}>

        {/* ── Sidebar ── */}
        {showFilters && (
          <div style={{
            width: 260, flexShrink: 0, background: "#fff",
            borderRight: "1px solid #e5e5e5", overflowY: "auto",
            padding: "24px 24px 32px",
          }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                textTransform: "uppercase", color: "#8d8d8d", marginBottom: 14 }}>
                Question
              </div>
              {questions.map(({ q_num, topic }) => {
                const active = selQ === q_num;
                return (
                  <button key={q_num} onClick={() => handleQSelect(q_num)} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "7px 0",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 15, fontWeight: 400, color: "#111",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    borderBottom: active ? "2px solid #111" : "2px solid transparent",
                    marginBottom: 2, letterSpacing: 0.1,
                    textDecoration: active ? "underline" : "none", textUnderlineOffset: 3,
                  }}>
                    <span style={{ fontSize: 11, color: "#8d8d8d", marginRight: 6 }}>{q_num}</span>
                    {topic}
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
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", minWidth: 0 }}>

          {promptText && (
            <div style={{
              background: "#fff", border: "1px solid #e5e5e5", borderLeft: "3px solid #111",
              padding: "12px 18px", marginBottom: 24, borderRadius: 2,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                textTransform: "uppercase", color: "#8d8d8d", marginBottom: 4 }}>Prompt</div>
              <div style={{ fontSize: 14, color: "#333", fontStyle: "italic", lineHeight: 1.6 }}>
                <HighlightedText text={promptText} searchTerm={searchTerm} />
              </div>
            </div>
          )}

          {showColHeaders && (
            <div style={{
              display: "grid",
              gridTemplateColumns: `${rowLabelWidth ? rowLabelWidth + "px " : ""}repeat(${effectiveCols.length}, 1fr)`,
              gap: 12, marginBottom: 10,
            }}>
              {rowLabelWidth > 0 && <div/>}
              {effectiveCols.map(colVal => (
                <div key={String(colVal)} style={{
                  padding: "8px 14px", background: "#fff",
                  borderTop: `2px solid ${colDim ? dimColor(colDim, colVal) : "#111"}`,
                  border: "1px solid #e5e5e5", borderRadius: 2, textAlign: "center",
                  fontSize: 13, fontWeight: 700,
                  color: colDim ? dimColor(colDim, colVal) : "#111", letterSpacing: 0.3,
                }}>
                  {colDim ? dimLabel(colDim, colVal) : ""}
                </div>
              ))}
            </div>
          )}

          {effectiveRows.map(rowVal => (
            <div key={String(rowVal)} style={{
              display: "grid",
              gridTemplateColumns: `${rowLabelWidth ? rowLabelWidth + "px " : ""}repeat(${effectiveCols.length}, 1fr)`,
              gap: 12, marginBottom: 16, alignItems: "start",
            }}>
              {showRowLabels && (
                <div style={{ paddingRight: 14, paddingTop: 12, borderRight: "1px solid #e5e5e5" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
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

                // Peers = other rows in same column + other cards within this cell
                const colPeerResponses = getPeerResponses(colVal, rowVal);

                return (
                  <div key={String(colVal)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {cellCards.map((card, k) => {
                      const uniqueWords = showDiff
                        ? computeUniqueWords(card.response, [
                            ...colPeerResponses,
                            ...cellCards.filter((_, ki) => ki !== k).map(c => c.response),
                          ])
                        : null;

                      return (
                        <ResponseCard key={k}
                          model={card.model} language={card.language}
                          therapy={card.therapy} repetition={card.repetition}
                          response={card.response}
                          showWordCount={showWordCount}
                          maxWordCount={maxWordCount}
                          showDiff={showDiff}
                          uniqueWords={uniqueWords}
                          showUniqueBadges={showUniqueBadges}
                          searchTerm={searchTerm}
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
