// src/components/Toolbar.jsx
// AnalysisToolbar, ToolbarBtn, KeywordChips, ModelColorPicker, SortByDropdown

import { useState, useRef, useEffect } from "react";
import { ALL_DIMS, MODEL_META } from "../config/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const CHIP_COLORS = [
  "#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6",
  "#ec4899","#06b6d4","#84cc16","#f97316","#6366f1",
];

const COLOR_SWATCHES = [
  "#7c3aed","#2563eb","#059669","#dc2626","#d97706",
  "#0891b2","#db2777","#65a30d","#111111","#6b7280",
];

const FONT_OPTIONS = [
  { label: "Georgia",   value: "'Georgia', serif" },
  { label: "Helvetica", value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Mono",      value: "'Courier New', monospace" },
  { label: "System",    value: "system-ui, sans-serif" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function Divider() {
  return (
    <div style={{ width: 1, height: 18, background: "#e5e5e5", margin: "0 6px", flexShrink: 0 }}/>
  );
}

export function ToolbarBtn({ active, onClick, children, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 3,
      border: `1px solid ${active ? "#555" : "#ddd"}`,
      background: active ? "#f0f0f0" : "#fff",
      color: active ? "#111" : "#666",
      fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      letterSpacing: 0.2, transition: "all .12s", whiteSpace: "nowrap",
    }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SortByDropdown
// ─────────────────────────────────────────────────────────────────────────────

export function SortByDropdown({ colDim, rowDim, onChange }) {
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
// KeywordChips
// ─────────────────────────────────────────────────────────────────────────────

export function KeywordChips({ keywords, onAdd, onRemove, onClearAll, suggestions }) {
  const [input, setInput]     = useState("");
  const [showSug, setShowSug] = useState(false);
  const inputRef = useRef(null);

  function addKeyword(term) {
    const t = term.trim().toLowerCase();
    if (!t || keywords.some(k => k.term === t)) return;
    onAdd({ term: t, color: CHIP_COLORS[keywords.length % CHIP_COLORS.length] });
    setInput("");
    setShowSug(false);
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
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4,
      padding: "4px 8px", border: "1px solid #e5e5e5", borderRadius: 6,
      background: "#fff", minHeight: 34, flex: 1,
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
          }}>×</button>
        </span>
      ))}

      <div style={{ position: "relative", flex: 1, minWidth: 80 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSug(true); }}
          onKeyDown={handleKey}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder={keywords.length === 0 ? "Add keyword…" : "+"}
          style={{
            border: "none", outline: "none", fontSize: 12,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            background: "transparent", color: "#111",
            width: "100%", padding: "2px 4px",
          }}
        />

        {showSug && suggestions.length > 0 && (
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
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelColorPicker
// ─────────────────────────────────────────────────────────────────────────────

export function ModelColorPicker({ model, color, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 11, color: "#555" }}>{MODEL_META[model]?.label || model}</span>
      <button onClick={() => setOpen(o => !o)} style={{
        width: 14, height: 14, borderRadius: 3, background: color,
        border: "1.5px solid rgba(0,0,0,.15)", cursor: "pointer", padding: 0, flexShrink: 0,
      }}/>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500,
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,.12)", padding: 8,
          display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, width: 120,
        }}>
          {COLOR_SWATCHES.map(c => (
            <button key={c} onClick={() => { onChange(model, c); setOpen(false); }} style={{
              width: 18, height: 18, borderRadius: 3, background: c,
              border: c === color ? "2px solid #111" : "1.5px solid rgba(0,0,0,.1)",
              cursor: "pointer", padding: 0,
            }}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisToolbar
// ─────────────────────────────────────────────────────────────────────────────

export function AnalysisToolbar({
  showDiff,       setShowDiff,
  showWordCount,  setShowWordCount,
  showKeywords,   setShowKeywords,
  showTopTerms,   setShowTopTerms,
  partialMatch,   setPartialMatch,
  highlightStyle, setHighlightStyle,
  highlightColor, setHighlightColor,
  fontSize,       setFontSize,
  fontFamily,     setFontFamily,
  modelColors,    onModelColorChange,
  allModels,
}) {
  // Highlight color picker open state
  const [hlColorOpen, setHlColorOpen] = useState(false);
  const hlColorRef = useRef(null);
  useEffect(() => {
    function h(e) { if (hlColorRef.current && !hlColorRef.current.contains(e.target)) setHlColorOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const HIGHLIGHT_COLORS = [
    "#FFD600","#fbbf24","#f97316","#ef4444",
    "#10b981","#3b82f6","#8b5cf6","#ec4899",
  ];

  return (
    <div style={{
      background: "#fff", borderBottom: "1px solid #e5e5e5",
      padding: "0 24px", display: "flex", alignItems: "center",
      height: 40, gap: 2, flexWrap: "nowrap", overflow: "hidden",
      position: "sticky", top: 96, zIndex: 198,
    }}>

      {/* Different Words */}
      <ToolbarBtn active={showDiff} onClick={() => setShowDiff(d => !d)}
        title="Highlight words unique to this response vs peers">
        Different Words
      </ToolbarBtn>
      {showDiff && (
        <ToolbarBtn active={showTopTerms} onClick={() => setShowTopTerms(b => !b)}
          title="Show top distinct terms under each card">
          Top Terms
        </ToolbarBtn>
      )}

      <Divider/>

      {/* Word Count */}
      <ToolbarBtn active={showWordCount} onClick={() => setShowWordCount(w => !w)}
        title="Show word count bar at bottom of card">
        Word Count
      </ToolbarBtn>

      <Divider/>

      {/* Keywords */}
      <ToolbarBtn active={showKeywords} onClick={() => setShowKeywords(k => !k)}
        title="Keyword highlighting">
        Keywords
      </ToolbarBtn>
      {showKeywords && (
        <>
          <Divider/>
          <ToolbarBtn active={!partialMatch} onClick={() => setPartialMatch(false)} title="Match whole words only">
            Whole
          </ToolbarBtn>
          <ToolbarBtn active={partialMatch} onClick={() => setPartialMatch(true)} title="Match partial words">
            Partial
          </ToolbarBtn>
        </>
      )}

      <Divider/>

      {/* Highlight style — Apple/Word style icons */}
      {/* Highlighter (fill) */}
      <button
        onClick={() => setHighlightStyle("fill")}
        title="Highlight fill"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 26, borderRadius: 3, cursor: "pointer",
          border: `1px solid ${highlightStyle === "fill" ? "#555" : "#ddd"}`,
          background: highlightStyle === "fill" ? "#f0f0f0" : "#fff",
          padding: 0,
        }}
      >
        {/* Highlighter marker icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="3" width="14" height="10" rx="2"
            fill={highlightStyle === "fill" ? highlightColor : "#ddd"}
            stroke={highlightStyle === "fill" ? "#555" : "#bbb"} strokeWidth="1.2"/>
          <path d="M9 13 L9 17 L12 20 L15 17 L15 13" fill="#888" stroke="none"/>
          <line x1="5" y1="22" x2="19" y2="22" stroke={highlightStyle === "fill" ? "#555" : "#bbb"} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Underline icon */}
      <button
        onClick={() => setHighlightStyle("underline")}
        title="Underline highlight"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 26, borderRadius: 3, cursor: "pointer",
          border: `1px solid ${highlightStyle === "underline" ? "#555" : "#ddd"}`,
          background: highlightStyle === "underline" ? "#f0f0f0" : "#fff",
          padding: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <text x="4" y="16" fontSize="14" fontWeight="bold"
            fill={highlightStyle === "underline" ? "#111" : "#888"}
            fontFamily="serif" style={{ textDecoration: "underline" }}>U</text>
          <line x1="4" y1="20" x2="20" y2="20"
            stroke={highlightStyle === "underline" ? highlightColor : "#bbb"}
            strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Highlight color picker */}
      <div ref={hlColorRef} style={{ position: "relative", marginLeft: 2 }}>
        <button
          onClick={() => setHlColorOpen(o => !o)}
          title="Highlight color"
          style={{
            width: 18, height: 18, borderRadius: 3,
            background: highlightColor,
            border: "1.5px solid rgba(0,0,0,.2)",
            cursor: "pointer", padding: 0, flexShrink: 0,
            display: "block",
          }}
        />
        {hlColorOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 600,
            background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,.15)", padding: 8,
            display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, width: 104,
          }}>
            {HIGHLIGHT_COLORS.map(c => (
              <button key={c} onClick={() => { setHighlightColor(c); setHlColorOpen(false); }} style={{
                width: 20, height: 20, borderRadius: 3, background: c,
                border: c === highlightColor ? "2.5px solid #111" : "1.5px solid rgba(0,0,0,.1)",
                cursor: "pointer", padding: 0,
              }}/>
            ))}
          </div>
        )}
      </div>

      <Divider/>

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

      {/* Font size — Word-style A^ A˅ */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 1, marginLeft: 3 }}>
        <button onClick={() => setFontSize(s => Math.min(20, s + 1))} title="Increase font size"
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "1px 3px", lineHeight: 1, color: "#555",
          }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "serif" }}>A</span>
          <span style={{ fontSize: 7, verticalAlign: "super", color: "#888" }}>▲</span>
        </button>
        <button onClick={() => setFontSize(s => Math.max(10, s - 1))} title="Decrease font size"
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "1px 3px", lineHeight: 1, color: "#555",
          }}>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "serif" }}>A</span>
          <span style={{ fontSize: 7, verticalAlign: "super", color: "#888" }}>▼</span>
        </button>
      </div>

      <Divider/>

      {/* Model color swatches */}
      {allModels.map(m => (
        <ModelColorPicker
          key={m}
          model={m}
          color={modelColors[m] || MODEL_META[m]?.color || "#111"}
          onChange={onModelColorChange}
        />
      ))}

    </div>
  );
}
