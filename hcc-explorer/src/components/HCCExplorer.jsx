// src/components/HCCExplorer.jsx

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ALL_DIMS, ALL_LANGUAGES, ALL_REPETITIONS,
  MODEL_META, THERAPY_COLOR, LANG_COLOR,
  dimColor, dimLabel,
} from "../config/constants";


// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "6px 0", cursor: "pointer",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: "none" }}
      />
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
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "16px 0",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <span style={{
          fontSize: 15, fontWeight: 700, color: "#111", letterSpacing: 0.2,
          border: open ? "2px solid #1a73e8" : "2px solid transparent",
          padding: "2px 0",
        }}>
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
            <button key={String(opt)} disabled={disabled} onClick={() => onPick(opt)}
              style={{
                padding: "6px 14px", borderRadius: 2,
                border: `1.5px solid ${active ? "#111" : "#e5e5e5"}`,
                background: active ? "#111" : "#fff",
                color: active ? "#fff" : disabled ? "#ccc" : "#111",
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: disabled ? "not-allowed" : "pointer",
                fontFamily: "'Helvetica Neue', Arial, sans-serif", letterSpacing: 0.2,
              }}>
              {optLabel(opt)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "0", background: "none", border: "none",
        fontSize: 14, fontWeight: 500, color: "#111",
        cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", letterSpacing: 0.2,
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
            <OptionButtons activeDim={colDim} blockedDim={rowDim} onPick={val => onChange(val, rowDim)}/>
          </div>
          <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: "uppercase", color: "#8d8d8d", marginBottom: 10 }}>Rows</div>
            <OptionButtons activeDim={rowDim} blockedDim={colDim} onPick={val => onChange(colDim, val)}/>
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

function ResponseCard({ model, language, therapy, repetition, response }) {
  const mc = MODEL_META[model]?.color || "#111";
  const ml = MODEL_META[model]?.label || model;
  const lc = LANG_COLOR[language]     || "#111";
  const tc = THERAPY_COLOR[therapy]   || "#111";
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e5e5", borderRadius: 4,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 1px 4px rgba(0,0,0,.06)", minWidth: 0,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
        borderBottom: "1px solid #f1f1f1", background: "#fafafa", flexWrap: "wrap",
      }}>
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
      <div style={{
        padding: "14px 16px", fontSize: 13.5, lineHeight: 1.85, color: "#333",
        whiteSpace: "pre-wrap", overflowY: "auto", maxHeight: 500,
        fontFamily: "'Georgia', serif", flex: 1,
      }}>
        {response || <span style={{ color: "#bbb", fontStyle: "italic" }}>No data for this combination</span>}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function HCCExplorer({ data }) {

  // ── Derive lists from data ───────────────────────────────────────────────

  const questions = useMemo(() => {
    const seen = new Map();
    data.forEach(r => { if (!seen.has(r.q_num)) seen.set(r.q_num, r.topic); });
    return [...seen.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([q_num, topic]) => ({ q_num, topic }));
  }, [data]);

  const allModels = useMemo(
    () => [...new Set(data.map(r => r.model))].sort(),
    [data]
  );

  // ── Filter state ─────────────────────────────────────────────────────────

  const [selQ,         setSelQ]         = useState("Q1");
  const [selTherapies, setSelTherapies] = useState(["General"]);
  const [selLangs,     setSelLangs]     = useState(["English", "Spanish"]);
  const [selModels,    setSelModels]    = useState([]);
  const [selReps,      setSelReps]      = useState([1]);
  const [showFilters,  setShowFilters]  = useState(true);
  const [colDim,       setColDim]       = useState("model");
  const [rowDim,       setRowDim]       = useState("language");

  // Sync once data loads
  useEffect(() => {
    if (data.length === 0) return;
    const firstQ  = [...new Set(data.map(r => r.q_num))].sort()[0];
    const models  = [...new Set(data.map(r => r.model))].sort();
    const firstQTherapies = [...new Set(data.filter(r => r.q_num === firstQ).map(r => r.therapy))].sort();
    setSelQ(firstQ);
    setSelModels(models);
    setSelTherapies(firstQTherapies); // select ALL therapies for first question
  }, [data]);

  // ── Therapies available for selected question ────────────────────────────

  const availTherapies = useMemo(
    () => [...new Set(data.filter(r => r.q_num === selQ).map(r => r.therapy))].sort(),
    [data, selQ]
  );

  // ── Derived breadcrumb values ────────────────────────────────────────────

  const currentTopic    = questions.find(q => q.q_num === selQ)?.topic ?? selQ;
  const therapyLabel    = selTherapies.length === 1 ? selTherapies[0]
                        : selTherapies.length === availTherapies.length ? "All Therapies"
                        : `${selTherapies.length} Therapies`;

  // ── Event handlers ───────────────────────────────────────────────────────

  function handleQSelect(q) {
    setSelQ(q);
    // BUG FIX: always reset to ALL available therapies for the new question.
    // Previously, stale selections from the previous question were kept,
    // causing checkboxes to appear checked but produce no cards.
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

  // ── Selection map ────────────────────────────────────────────────────────

  const selValues = {
    therapy:    selTherapies,
    language:   selLangs,
    model:      selModels,
    repetition: selReps,
  };

  // ── Prompt text ──────────────────────────────────────────────────────────

  const promptText = useMemo(() => {
    const r = data.find(rec =>
      rec.q_num === selQ &&
      selTherapies.includes(rec.therapy) &&
      selLangs.includes(rec.language)
    );
    return r?.prompt ?? "";
  }, [data, selQ, selTherapies, selLangs]);

  // ── Response lookup ──────────────────────────────────────────────────────

  function getResponse({ therapy, language, model, repetition }) {
    return data.find(r =>
      r.q_num      === selQ       &&
      r.therapy    === therapy    &&
      r.language   === language   &&
      r.model      === model      &&
      r.repetition === repetition
    )?.response ?? null;
  }

  // ── Grid ─────────────────────────────────────────────────────────────────

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

  // Nav height: top bar (48) + explorer bar (48) = 96px total
  const NAV_HEIGHT = 96;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#f5f5f5", minHeight: "100vh", color: "#111" }}>

      {/* ── Top bar (site-level nav) ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e5e5",
        padding: "0 32px", display: "flex", alignItems: "center", height: 48,
        position: "sticky", top: 0, zIndex: 200,
      }}>
        {/* Logo / site name */}
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: 0.5, marginRight: 40 }}>
          KGRT Lab
        </span>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 28, flex: 1 }}>
          {["About", "Background", "Abstract", "HCC Response Explorer"].map(link => (
            <a key={link} href="#" style={{
              fontSize: 14, fontWeight: 500, color: "#111",
              textDecoration: "none", letterSpacing: 0.2,
              borderBottom: link === "Results" ? "2px solid #111" : "2px solid transparent",
              paddingBottom: 2,
            }}
              onClick={e => e.preventDefault()}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Right side placeholder */}
        <span style={{ fontSize: 13, color: "#8d8d8d" }}>HCC Patient Education Study</span>
      </div>

      {/* ── Explorer bar (section-level) ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e5e5",
        padding: "0 32px", display: "flex", alignItems: "center", height: 48,
        position: "sticky", top: 48, zIndex: 199,
      }}>
        {/* Breadcrumb */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8d8d8d" }}>
          <span style={{ color: "#111", fontWeight: 600 }}>HCC Explorer</span>
          <span>/</span>
          <span>{selQ}</span>
          <span>/</span>
          <span>{currentTopic}</span>
          <span>/</span>
          <span style={{ color: "#111", fontWeight: 500 }}>{therapyLabel}</span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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

      {/* ── Body ── */}
      <div style={{ display: "flex", height: `calc(100vh - ${NAV_HEIGHT}px)` }}>

        {/* ── Sidebar ── */}
        {showFilters && (
          <div style={{
            width: 260, flexShrink: 0, background: "#fff",
            borderRight: "1px solid #e5e5e5", overflowY: "auto",
            padding: "24px 24px 32px",
          }}>

            {/* Questions */}
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
                    textDecoration: active ? "underline" : "none",
                    textUnderlineOffset: 3,
                  }}>
                    <span style={{ fontSize: 11, color: "#8d8d8d", marginRight: 6 }}>{q_num}</span>
                    {topic}
                  </button>
                );
              })}
            </div>

            {/* Therapy */}
            <AccordionSection title="Therapy">
              {availTherapies.map(val => (
                <Checkbox key={val}
                  checked={selTherapies.includes(val)}
                  onChange={() => toggle(val, setSelTherapies)}
                  label={val}
                />
              ))}
            </AccordionSection>

            {/* Language */}
            <AccordionSection title="Language">
              {ALL_LANGUAGES.map(val => (
                <Checkbox key={val}
                  checked={selLangs.includes(val)}
                  onChange={() => toggle(val, setSelLangs)}
                  label={val}
                />
              ))}
            </AccordionSection>

            {/* Model */}
            <AccordionSection title="Model">
              {allModels.map(val => (
                <Checkbox key={val}
                  checked={selModels.includes(val)}
                  onChange={() => toggle(val, setSelModels)}
                  label={MODEL_META[val]?.label ?? val}
                />
              ))}
            </AccordionSection>

            {/* Repetition */}
            <AccordionSection title="Repetition">
              {ALL_REPETITIONS.map(val => (
                <Checkbox key={val}
                  checked={selReps.includes(val)}
                  onChange={() => toggle(val, setSelReps)}
                  label={`Rep ${val}`}
                />
              ))}
            </AccordionSection>

          </div>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", minWidth: 0 }}>

          {/* Prompt bar */}
          {promptText && (
            <div style={{
              background: "#fff", border: "1px solid #e5e5e5", borderLeft: "3px solid #111",
              padding: "12px 18px", marginBottom: 24, borderRadius: 2,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                textTransform: "uppercase", color: "#8d8d8d", marginBottom: 4 }}>
                Prompt
              </div>
              <div style={{ fontSize: 14, color: "#333", fontStyle: "italic", lineHeight: 1.6 }}>
                {promptText}
              </div>
            </div>
          )}

          {/* Column headers */}
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

          {/* Rows */}
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
                const cards = freeCombos.map(freeCombo => {
                  const full = { ...freeCombo };
                  if (colDim && colVal !== null) full[colDim] = colVal;
                  if (rowDim && rowVal !== null) full[rowDim] = rowVal;
                  ALL_DIMS.forEach(({ id }) => {
                    if (full[id] === undefined) full[id] = selValues[id][0];
                  });
                  return { ...full, response: getResponse(full) };
                });
                return (
                  <div key={String(colVal)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {cards.map((card, k) => (
                      <ResponseCard key={k}
                        model={card.model} language={card.language}
                        therapy={card.therapy} repetition={card.repetition}
                        response={card.response}
                      />
                    ))}
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
