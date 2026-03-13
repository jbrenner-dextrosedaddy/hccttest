// src/components/HCCExplorer.jsx
// Main orchestrator — state, data flow, layout only.
// All logic lives in utils.js, Cards.jsx, Toolbar.jsx

import { useState, useMemo, useEffect } from "react";
import {
  ALL_DIMS, ALL_LANGUAGES, ALL_REPETITIONS,
  MODEL_META, LANG_COLOR, dimColor, dimLabel,
} from "../config/constants";
import {
  wordCount, diffScore, computeUniqueWords,
  topUniqueTerms, suggestedKeywords,
} from "../utils";
import { ResponseCard, HighlightedText } from "./Cards";
import {
  AnalysisToolbar, KeywordChips,
  SortByDropdown, Divider,
} from "./Toolbar";

// ─────────────────────────────────────────────────────────────────────────────
// Small local components (too simple to split out)
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
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function HCCExplorer({ data }) {

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
  const [selModels,    setSelModels]    = useState([]);
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

  // topbar(48) + breadcrumb(48) + toolbar(40) = 136
  const NAV_HEIGHT = 136;

  // Max word count for scaling bars
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

  // Peer responses for diff
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

  // All visible responses for suggested keywords
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#f5f5f5", minHeight: "100vh", color: "#111" }}>

      {/* ── Top nav bar ── */}
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

      {/* ── Breadcrumb bar — Hide Filters + Sort By on right ── */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
        fontSize={fontSize}             setFontSize={setFontSize}
        fontFamily={fontFamily}         setFontFamily={setFontFamily}
        modelColors={modelColors}       onModelColorChange={handleModelColorChange}
        allModels={allModels}
      />

      {/* ── Keyword input bar ── */}
      {showKeywords && (
        <div style={{
          background: "#fafafa", borderBottom: "1px solid #e5e5e5",
          padding: "10px 32px", position: "sticky", top: 136, zIndex: 197,
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
                    fontSize: 14, fontWeight: active ? 700 : 400, color: "#111",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    textDecoration: active ? "underline" : "none", textUnderlineOffset: 3,
                    marginBottom: 2,
                  }}>
                    <span style={{ fontSize: 10, color: "#aaa", marginRight: 6 }}>{q_num}</span>
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
                      const dWords = showDiff ? computeUniqueWords(card.response, allPeers) : null;
                      const dScore = showDiff ? diffScore(card.response, allPeers) : undefined;
                      const tTerms = (showDiff && showTopTerms)
                        ? topUniqueTerms(card.response, allPeers, 6) : null;
                      const mc = modelColors[card.model] || MODEL_META[card.model]?.color || "#111";

                      return (
                        <ResponseCard key={k}
                          model={card.model}       language={card.language}
                          therapy={card.therapy}   repetition={card.repetition}
                          response={card.response}
                          showWordCount={showWordCount}  maxWordCount={maxWordCount}
                          showDiff={showDiff}            diffWords={dWords}
                          diffScoreValue={dScore}        showTopTerms={showTopTerms}
                          topTerms={tTerms}              keywords={keywords}
                          highlightStyle={highlightStyle} partialMatch={partialMatch}
                          fontSize={fontSize}            fontFamily={fontFamily}
                          modelColor={mc}
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
