// src/components/HCCExplorer.jsx
// Main orchestrator — state, data flow, layout only.
// FIX: diff precomputed in useMemo, not inside render loop
// FIX: stable card keys (not array index)
// FIX: cross-language warning passed to cards

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ALL_DIMS, ALL_LANGUAGES, ALL_REPETITIONS,
  MODEL_META, dimColor, dimLabel,
} from "../config/constants";
import {
  wordCount, precomputeDiff,
  suggestedKeywords, isCrossLanguageDiff,
} from "../utils";
import { ResponseCard, HighlightedText } from "./Cards";
import {
  AnalysisToolbar, KeywordChips,
  SortByDropdown, Divider,
} from "./Toolbar";

// ─────────────────────────────────────────────────────────────────────────────
// Small local components
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

function AccordionSection({ title, children, defaultOpen = true, tooltip }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid #e5e5e5" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "16px 0",
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111",
            letterSpacing: 0.2, padding: "2px 0" }}>{title}</span>
          {tooltip && (
            <span title={tooltip} style={{
              width: 14, height: 14, borderRadius: "50%", background: "#e5e5e5",
              color: "#888", fontSize: 9, fontWeight: 700, display: "inline-flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "help",
            }}>?</span>
          )}
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
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function HCCExplorer({ data }) {
  const navigate = useNavigate();

  // ── Derived lists ──────────────────────────────────────────────────────────

  const questions = useMemo(() => {
    const seen = new Map();
    data.forEach(r => { if (!seen.has(r.q_num)) seen.set(r.q_num, r.topic); });
    return [...seen.entries()].sort(([a],[b]) => a.localeCompare(b))
      .map(([q_num, topic]) => ({ q_num, topic }));
  }, [data]);

  const allModels = useMemo(() => [...new Set(data.map(r => r.model))].sort(), [data]);

  // ── Filter state ───────────────────────────────────────────────────────────

  const [selQ,         setSelQ]         = useState("Q1");
  const [selTherapies, setSelTherapies] = useState(["General"]);
  const [selLangs,     setSelLangs]     = useState(["English", "Spanish"]);
  const [selModels,    setSelModels]    = useState(() => [...new Set(data.map(r => r.model))].sort());
  const [selReps,      setSelReps]      = useState([1]);
  const [showFilters,  setShowFilters]  = useState(true);
  const [colDim,       setColDim]       = useState("model");
  const [rowDim,       setRowDim]       = useState("language");

  // ── Analysis state ─────────────────────────────────────────────────────────

  const [showDiff,       setShowDiff]       = useState(false);
  const [showTopTerms,   setShowTopTerms]   = useState(false);
  const [showWordCount,  setShowWordCount]  = useState(false);
  const [showKeywords,   setShowKeywords]   = useState(false);
  const [keywords,       setKeywords]       = useState([]);
  const [highlightStyle, setHighlightStyle] = useState("fill");
  const [highlightColor, setHighlightColor] = useState("#FFD600");
  const [partialMatch,   setPartialMatch]   = useState(false);
  const [fontSize,       setFontSize]       = useState(13);
  const [fontFamily,     setFontFamily]     = useState("'Georgia', serif");
  const [modelColors,    setModelColors]    = useState({});

  function handleModelColorChange(model, color) {
    setModelColors(prev => ({ ...prev, [model]: color }));
  }

  // ── Sync on data load ──────────────────────────────────────────────────────

  useEffect(() => {
    if (data.length === 0) return;
    const firstQ = [...new Set(data.map(r => r.q_num))].sort()[0];
    const models = [...new Set(data.map(r => r.model))].sort();
    const firstQTherapies = [...new Set(data.filter(r => r.q_num === firstQ).map(r => r.therapy))].sort();
    setSelQ(firstQ);
    setSelModels(models);
    setSelTherapies(firstQTherapies);
  }, [data]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const availTherapies = useMemo(
    () => [...new Set(data.filter(r => r.q_num === selQ).map(r => r.therapy))].sort(),
    [data, selQ]
  );

  const currentTopic = questions.find(q => q.q_num === selQ)?.topic ?? selQ;
  const therapyLabel = selTherapies.length === 1 ? selTherapies[0]
                     : selTherapies.length === availTherapies.length ? "All Therapies"
                     : `${selTherapies.length} Therapies`;

  // Cross-language warning: only relevant when:
  // 1. Diff is actually ON
  // 2. Both languages are selected
  // 3. Language is NOT assigned to a row or col axis (so peers are mixed-language)
  const crossLanguageWarning = showDiff && isCrossLanguageDiff(rowDim, colDim, selLangs);

  // ── Handlers ───────────────────────────────────────────────────────────────

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

  function addKeyword(kw)      { setKeywords(prev => [...prev, kw]); }
  function removeKeyword(term) { setKeywords(prev => prev.filter(k => k.term !== term)); }
  function clearKeywords()     { setKeywords([]); }

  // ── Selection map ──────────────────────────────────────────────────────────

  const selValues = {
    therapy:    selTherapies,
    language:   selLangs,
    model:      selModels,
    repetition: selReps,
  };

  // ── Prompt ─────────────────────────────────────────────────────────────────

  const promptText = useMemo(() => {
    const r = data.find(rec =>
      rec.q_num === selQ &&
      selTherapies.includes(rec.therapy) &&
      selLangs.includes(rec.language)
    );
    return r?.prompt ?? "";
  }, [data, selQ, selTherapies, selLangs]);

  // ── Response lookup ────────────────────────────────────────────────────────

  function getResponse({ therapy, language, model, repetition }) {
    return data.find(r =>
      r.q_num      === selQ    &&
      r.therapy    === therapy &&
      r.language   === language &&
      r.model      === model   &&
      r.repetition === repetition
    )?.response ?? null;
  }

  // ── Grid ───────────────────────────────────────────────────────────────────

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

  // ── Max word count for bar scaling ─────────────────────────────────────────

  const maxWordCount = useMemo(() => {
    let max = 1;
    effectiveRows.forEach(rowVal => {
      effectiveCols.forEach(colVal => {
        freeCombos.forEach(fc => {
          const full = { ...fc };
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

  // ── FIX: Precompute peer map ONCE, outside render ──────────────────────────
  // Build { colVal → { rowVal → [peerResponses] } } so getPeerResponses is O(1)

  // FIXED PEER DIRECTION: peers = OTHER COLUMNS in the SAME ROW.
  // e.g. colDim=model, rowDim=language:
  //   Claude/English peers -> [GPT/English]  (same language, different model)  CORRECT
  //   NOT Claude/Spanish                      (different language)              WRONG
  const peerMap = useMemo(() => {
    const map = new Map();
    effectiveCols.forEach(colVal => {
      const colKey = String(colVal);
      if (!map.has(colKey)) map.set(colKey, new Map());
      effectiveRows.forEach(rowVal => {
        const peers = [];
        // Peers = OTHER COLUMNS, SAME ROW (not other rows)
        effectiveCols.forEach(cv => {
          if (String(cv) === String(colVal)) return; // skip self
          freeCombos.forEach(fc => {
            const full = { ...fc };
            if (colDim && cv !== null)       full[colDim] = cv;
            if (rowDim && rowVal !== null)   full[rowDim] = rowVal;
            ALL_DIMS.forEach(({ id }) => { if (full[id] === undefined) full[id] = selValues[id][0]; });
            const resp = getResponse(full);
            if (resp) peers.push(resp);
          });
        });
        map.get(colKey).set(String(rowVal), peers);
      });
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selTherapies, selLangs, selModels, selReps, colDim, rowDim, selQ]);

  // ── FIX: Precompute diff results ONCE in useMemo ───────────────────────────
  // Previously called computeUniqueWords/diffScore inside render — now memoized

  const diffMap = useMemo(() => {
    if (!showDiff) return new Map();

    const cards = [];
    effectiveRows.forEach(rowVal => {
      effectiveCols.forEach(colVal => {
        const colPeers = peerMap.get(String(colVal))?.get(String(rowVal)) || [];
        freeCombos.forEach(fc => {
          const full = { ...fc };
          if (colDim && colVal !== null) full[colDim] = colVal;
          if (rowDim && rowVal !== null) full[rowDim] = rowVal;
          ALL_DIMS.forEach(({ id }) => { if (full[id] === undefined) full[id] = selValues[id][0]; });
          full.response = getResponse(full);

          // FIX: stable card key — not array index
          const cardKey = [full.model, full.language, full.therapy, full.repetition].join("|");

          // Within-cell peers (other freeCombos in same cell)
          const cellPeerResponses = freeCombos
            .filter(fc2 => {
              const other = { ...fc2 };
              if (colDim && colVal !== null) other[colDim] = colVal;
              if (rowDim && rowVal !== null) other[rowDim] = rowVal;
              ALL_DIMS.forEach(({ id }) => { if (other[id] === undefined) other[id] = selValues[id][0]; });
              const otherKey = [other.model, other.language, other.therapy, other.repetition].join("|");
              return otherKey !== cardKey;
            })
            .map(fc2 => {
              const other = { ...fc2 };
              if (colDim && colVal !== null) other[colDim] = colVal;
              if (rowDim && rowVal !== null) other[rowDim] = rowVal;
              ALL_DIMS.forEach(({ id }) => { if (other[id] === undefined) other[id] = selValues[id][0]; });
              return getResponse(other);
            })
            .filter(Boolean);

          const allPeers = [...colPeers, ...cellPeerResponses];
          cards.push({ key: cardKey, response: full.response, peers: allPeers });
        });
      });
    });

    return precomputeDiff(cards, showTopTerms);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDiff, showTopTerms, selTherapies, selLangs, selModels, selReps, colDim, rowDim, selQ, peerMap]);

  // ── Suggested keywords ─────────────────────────────────────────────────────

  const allVisibleResponses = useMemo(() => {
    const resps = [];
    effectiveRows.forEach(rowVal => {
      effectiveCols.forEach(colVal => {
        freeCombos.forEach(fc => {
          const full = { ...fc };
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#f5f5f5", height: "100vh", display: "flex", flexDirection: "column", color: "#111", overflow: "hidden" }}>

      {/* ── Top nav bar ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e5e5",
        padding: "0 32px", display: "flex", alignItems: "center", height: 48,
        flexShrink: 0, zIndex: 200,
      }}>
        <button onClick={() => navigate("/")} style={{
          fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: 0.5, marginRight: 40,
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}>
          KGR Lab
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 28, flex: 1 }}>
          {["About", "Background", "Abstract", "HCC Responses"].map(link => (
            <a key={link} href={link === "HCC Responses" ? "#" : `/${link.toLowerCase()}`} style={{
              fontSize: 14, fontWeight: 500, color: "#111",
              textDecoration: "none", letterSpacing: 0.2,
              borderBottom: link === "HCC Responses" ? "2px solid #111" : "2px solid transparent",
              paddingBottom: 2,
            }} onClick={link === "HCC Responses" ? e => e.preventDefault() : undefined}>{link}</a>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "#8d8d8d" }}>HCC Patient Education Study</span>
      </div>

      {/* ── Breadcrumb bar — Hide Filters + Arrange on right ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #ebebeb",
        padding: "0 32px", display: "flex", alignItems: "center", height: 40,
        flexShrink: 0, zIndex: 199,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "#8d8d8d", flex: 1, overflow: "hidden" }}>
          <span style={{ color: "#111", fontWeight: 600, whiteSpace: "nowrap" }}>HCC Responses</span>
          <span>/</span><span style={{ whiteSpace: "nowrap" }}>{selQ}</span>
          <span>/</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentTopic}</span>
          <span>/</span>
          <span style={{ color: "#111", fontWeight: 500, whiteSpace: "nowrap" }}>{therapyLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <button onClick={() => setShowFilters(f => !f)} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 500, color: "#555",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>
            {showFilters ? "Hide Filters" : "Show Filters"}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="#666"/>
              <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="#666"/>
              <line x1="4" y1="18" x2="20" y2="18"/><circle cx="10" cy="18" r="2" fill="#666"/>
            </svg>
          </button>
          <Divider/>
          <SortByDropdown colDim={colDim} rowDim={rowDim} onChange={handleAxisChange}/>
        </div>
      </div>

      {/* ── Analysis toolbar ── */}
      <AnalysisToolbar
        showDiff={showDiff}             setShowDiff={setShowDiff}
        showWordCount={showWordCount}   setShowWordCount={setShowWordCount}
        showKeywords={showKeywords}     setShowKeywords={setShowKeywords}
        showTopTerms={showTopTerms}     setShowTopTerms={setShowTopTerms}
        partialMatch={partialMatch}     setPartialMatch={setPartialMatch}
        highlightStyle={highlightStyle} setHighlightStyle={setHighlightStyle}
        highlightColor={highlightColor} setHighlightColor={setHighlightColor}
        fontSize={fontSize}             setFontSize={setFontSize}
        fontFamily={fontFamily}         setFontFamily={setFontFamily}
        modelColors={modelColors}       onModelColorChange={handleModelColorChange}
        allModels={allModels}
        canUseDiff={effectiveCols.length > 1 || effectiveRows.length > 1}
      />

      {/* ── Cross-language diff warning banner ── */}
      {crossLanguageWarning && (
        <div style={{
          background: "#fffbeb", borderBottom: "1px solid #fde68a",
          padding: "6px 32px", fontSize: 12, color: "#92400e",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <span>⚠</span>
          <span>
            <strong>Cross-language comparison active.</strong> Unique-word % is inflated when English and Spanish appear in the same peer group.
            Use "Arrange" → set Rows or Columns to <em>Language</em> to compare within the same language.
          </span>
        </div>
      )}

      {/* ── Keyword input bar ── */}
      {showKeywords && (
        <div style={{
          background: "#fafafa", borderBottom: "1px solid #e5e5e5",
          padding: "10px 32px", flexShrink: 0, zIndex: 197,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", color: "#aaa", whiteSpace: "nowrap" }}>
              Keywords
            </div>
            <KeywordChips
              keywords={keywords}
              onAdd={addKeyword}
              onRemove={removeKeyword}
              onClearAll={clearKeywords}
              suggestions={suggestions}
            />
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

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
                    display: "flex", alignItems: "center", width: "100%", textAlign: "left", padding: "7px 0",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: active ? 700 : 400, color: active ? "#111" : "#555",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    marginBottom: 2, gap: 8,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: active ? "#111" : "transparent",
                      border: active ? "none" : "1.5px solid #ccc",
                      transition: "all .12s",
                    }}/>
                    <span style={{ fontSize: 10, color: "#bbb", flexShrink: 0 }}>{q_num}</span>
                    <span>{topic}</span>
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
            <AccordionSection title="Repetition" tooltip="3 independent runs per prompt at temperature 0, used to test reproducibility">
              {ALL_REPETITIONS.map(val => (
                <Checkbox key={val} checked={selReps.includes(val)}
                  onChange={() => toggle(val, setSelReps)} label={`Run ${val}`} />
              ))}
            </AccordionSection>
          </div>
        )}

        {/* ── Content area ── */}
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
                  diffWords={null}
                  diffColor="#111"
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
              {effectiveCols.map(colVal => {
                const colColor = colDim === "model"
                  ? (modelColors[colVal] || dimColor(colDim, colVal))
                  : dimColor(colDim, colVal);
                return (
                  <div key={String(colVal)} style={{
                    padding: "7px 12px", background: "#fff",
                    borderTop: `2px solid ${colColor}`,
                    border: "1px solid #e5e5e5", borderRadius: 2,
                    textAlign: "center", fontSize: 12, fontWeight: 700, color: colColor,
                  }}>
                    {colDim ? dimLabel(colDim, colVal) : ""}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {(effectiveRows.length === 0 || effectiveCols.length === 0 || selModels.length === 0 || selLangs.length === 0 || selReps.length === 0) && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "80px 40px", color: "#bbb", gap: 8,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 14, color: "#aaa" }}>No responses match the current filters.</span>
              <span style={{ fontSize: 12, color: "#ccc" }}>Select at least one option in each filter group.</span>
            </div>
          )}

          {/* Response rows */}
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
                const cellCards = freeCombos.map(fc => {
                  const full = { ...fc };
                  if (colDim && colVal !== null) full[colDim] = colVal;
                  if (rowDim && rowVal !== null) full[rowDim] = rowVal;
                  ALL_DIMS.forEach(({ id }) => {
                    if (full[id] === undefined) full[id] = selValues[id][0];
                  });
                  full.response = getResponse(full);
                  // FIX: stable key — not array index
                  full._key = [full.model, full.language, full.therapy, full.repetition].join("|");
                  return full;
                });

                return (
                  <div key={String(colVal)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {cellCards.map(card => {
                      const mc = modelColors[card.model] || MODEL_META[card.model]?.color || "#111";
                      // FIX: pull precomputed diff results from memoized map
                      const diff = diffMap.get(card._key);

                      return (
                        <ResponseCard key={card._key}
                          model={card.model}         language={card.language}
                          therapy={card.therapy}     repetition={card.repetition}
                          response={card.response}
                          showWordCount={showWordCount}    maxWordCount={maxWordCount}
                          showDiff={showDiff}              diffWords={diff?.dWords ?? null}
                          diffScoreValue={diff?.dScore}    showTopTerms={showTopTerms}
                          topTerms={diff?.tTerms ?? null}  keywords={keywords}
                          highlightStyle={highlightStyle}  partialMatch={partialMatch}
                          fontSize={fontSize}              fontFamily={fontFamily}
                          modelColor={mc}
                          crossLanguageWarning={crossLanguageWarning}
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
