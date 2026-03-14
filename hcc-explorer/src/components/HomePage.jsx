// src/components/HomePage.jsx
// KGR Lab landing page — study overview with live data visualisation

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const THERAPY_META = {
  RFA:     { label: "Radiofrequency Ablation",     color: "#0f9d58", short: "RFA" },
  MWA:     { label: "Microwave Ablation",           color: "#f59300", short: "MWA" },
  TACE:    { label: "Chemoembolization",            color: "#db4437", short: "TACE" },
  TARE:    { label: "Radioembolization (TARE)",     color: "#ab47bc", short: "TARE" },
  Y90:     { label: "Y-90 Segmentectomy",           color: "#00acc1", short: "Y-90" },
  General: { label: "Treatment Overview",           color: "#1a73e8", short: "General" },
};

const MODEL_META = {
  "claude-sonnet-4-6": { label: "Claude 4.5",  color: "#7c4dff" },
  "gpt-5.2":           { label: "ChatGPT 5.1", color: "#10a37f" },
};

const QUESTIONS = [
  { q: "Q1", label: "Treatment Landscape",   desc: "What minimally invasive options exist?" },
  { q: "Q2", label: "Doctor Options",        desc: "How do physicians choose between approaches?" },
  { q: "Q3", label: "Therapy Definition",    desc: "What is this procedure and how does it work?" },
  { q: "Q4", label: "Mechanism of Action",   desc: "What happens inside the body?" },
  { q: "Q5", label: "Curative Potential",    desc: "Can this treatment cure HCC?" },
  { q: "Q6", label: "Benefits & Limitations",desc: "What are the trade-offs?" },
  { q: "Q7", label: "Evidence & Outcomes",   desc: "What does the data show?" },
];

export default function HomePage({ data }) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!data?.length) return null;
    const totalResponses = data.length;
    const totalWords = data.reduce((s, r) => s + (r.response || "").trim().split(/\s+/).filter(Boolean).length, 0);
    const avgWords = Math.round(totalWords / totalResponses);
    const byModel = {};
    data.forEach(r => {
      if (!byModel[r.model]) byModel[r.model] = { words: 0, count: 0 };
      byModel[r.model].words += (r.response || "").trim().split(/\s+/).filter(Boolean).length;
      byModel[r.model].count++;
    });
    Object.values(byModel).forEach(m => { m.avg = Math.round(m.words / m.count); });
    return { totalResponses, avgWords, byModel };
  }, [data]);

  // Word count by therapy×model for the spark bars
  const therapyWordData = useMemo(() => {
    if (!data?.length) return [];
    const therapies = ["General", "RFA", "MWA", "TACE", "TARE", "Y90"];
    return therapies.map(therapy => {
      const rows = {};
      Object.keys(MODEL_META).forEach(model => {
        const recs = data.filter(r => r.therapy === therapy && r.model === model);
        const avg = recs.length
          ? Math.round(recs.reduce((s, r) => s + (r.response || "").trim().split(/\s+/).filter(Boolean).length, 0) / recs.length)
          : 0;
        rows[model] = avg;
      });
      return { therapy, ...rows };
    });
  }, [data]);

  const maxBar = useMemo(() => {
    let m = 0;
    therapyWordData.forEach(row => Object.values(MODEL_META).forEach(({ }) => {
      Object.keys(MODEL_META).forEach(k => { if (row[k] > m) m = row[k]; });
    }));
    return m || 1;
  }, [therapyWordData]);

  return (
    <div style={{
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      background: "#fafafa", minHeight: "100vh", color: "#111",
    }}>

      {/* ── Nav ── */}
      <nav style={{
        background: "#fff", borderBottom: "1px solid #e5e5e5",
        padding: "0 40px", display: "flex", alignItems: "center", height: 52,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.4, color: "#111", marginRight: 48 }}>
          KGR Lab
        </span>
        <div style={{ display: "flex", gap: 32, flex: 1 }}>
          {["About", "Background", "Abstract"].map(l => (
            <a key={l} href={`/${l.toLowerCase()}`} style={{
              fontSize: 14, fontWeight: 500, color: "#555", textDecoration: "none",
              borderBottom: "2px solid transparent", paddingBottom: 2,
            }}>{l}</a>
          ))}
          <button onClick={() => navigate("/explorer")} style={{
            fontSize: 14, fontWeight: 500, color: "#111",
            background: "none", border: "none", cursor: "pointer", padding: 0,
            borderBottom: "2px solid #111", paddingBottom: 2,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>HCC Responses</button>
        </div>
        <span style={{ fontSize: 12, color: "#aaa", letterSpacing: 0.3 }}>HCC Patient Education Study · 2026</span>
      </nav>

      {/* ── Hero ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e5e5",
        padding: "64px 40px 56px",
      }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
            color: "#aaa", marginBottom: 16,
          }}>
            KGR Lab &nbsp;·&nbsp; Interventional Radiology &nbsp;·&nbsp; NIH Clinical Center
          </div>
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, lineHeight: 1.18, letterSpacing: -0.5, marginBottom: 20 }}>
            Can AI explain liver cancer<br/>
            treatment — equally well<br/>
            in English and Spanish?
          </h1>
          <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, maxWidth: 620, marginBottom: 32 }}>
            We asked two state-of-the-art large language models — ChatGPT 5.1 and Claude 4.5 — to generate
            patient-facing explanations of four minimally invasive liver-directed therapies for hepatocellular
            carcinoma, in both English and Spanish. Then we graded every response.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/explorer")}
              style={{
                padding: "12px 28px", background: "#111", color: "#fff",
                border: "none", borderRadius: 4, fontSize: 14, fontWeight: 600,
                cursor: "pointer", letterSpacing: 0.3,
              }}
            >
              Explore All Responses →
            </button>
            <a href="#study" style={{
              padding: "12px 28px", background: "#fff", color: "#111",
              border: "1px solid #ddd", borderRadius: 4, fontSize: 14, fontWeight: 500,
              textDecoration: "none", cursor: "pointer", letterSpacing: 0.2,
              display: "inline-flex", alignItems: "center",
            }}>
              About the Study
            </a>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {stats && (
        <div style={{
          background: "#fff", borderBottom: "1px solid #e5e5e5",
          padding: "24px 40px", display: "flex", gap: 48, flexWrap: "wrap",
        }}>
          {[
            { val: stats.totalResponses, label: "Total responses" },
            { val: "2", label: "LLMs evaluated" },
            { val: "4", label: "Liver-directed therapies" },
            { val: "7", label: "Question types" },
            { val: "2", label: "Languages" },
            { val: "3", label: "Runs per prompt" },
            { val: stats.avgWords.toLocaleString() + " w", label: "Avg response length" },
          ].map(({ val, label }) => (
            <div key={label}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: -0.5, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4, letterSpacing: 0.2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Two-column content ── */}
      <div style={{ padding: "48px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, maxWidth: 1280 }}>

        {/* Therapies card */}
        <div style={{
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6,
          padding: "28px 28px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", marginBottom: 20 }}>
            Therapies covered
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(THERAPY_META).filter(([k]) => k !== "General").map(([key, meta]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 4, background: meta.color + "15",
                  border: `1px solid ${meta.color}33`, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: meta.color, letterSpacing: 0.5 }}>{meta.short}</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{meta.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f1f1" }}>
            <button
              onClick={() => navigate("/explorer")}
              style={{
                fontSize: 12, color: "#555", background: "none", border: "none",
                cursor: "pointer", padding: 0, fontFamily: "'Helvetica Neue', Arial, sans-serif",
                textDecoration: "underline", textUnderlineOffset: 3,
              }}
            >
              Compare model responses by therapy →
            </button>
          </div>
        </div>

        {/* Questions card */}
        <div style={{
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6,
          padding: "28px 28px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", marginBottom: 20 }}>
            Question domains
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {QUESTIONS.map(({ q, label, desc }) => (
              <button
                key={q}
                onClick={() => navigate(`/explorer?q=${q}`)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 10px",
                  background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  borderRadius: 4, transition: "background .12s",
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: "#bbb", letterSpacing: 0.5, flexShrink: 0, paddingTop: 3 }}>{q}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{label}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 1, lineHeight: 1.4 }}>{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Response length by therapy — full width */}
        <div style={{
          gridColumn: "1 / -1",
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6,
          padding: "28px 28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa" }}>
              Avg response length by therapy (words)
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {Object.entries(MODEL_META).map(([key, { label, color }]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#666" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color }}/>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {therapyWordData.map(({ therapy, ...modelWords }) => {
              const meta = THERAPY_META[therapy];
              return (
                <div key={therapy} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48, fontSize: 10, fontWeight: 700, color: meta.color,
                    letterSpacing: 0.5, textAlign: "right", flexShrink: 0,
                  }}>{meta.short}</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    {Object.entries(MODEL_META).map(([modelKey, { color }]) => {
                      const w = modelWords[modelKey] || 0;
                      const pct = Math.round((w / maxBar) * 100);
                      return (
                        <div key={modelKey} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 8, background: "#f1f1f1", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%",
                              background: color, borderRadius: 2,
                              transition: "width .5s cubic-bezier(.4,0,.2,1)",
                            }}/>
                          </div>
                          <span style={{ fontSize: 11, color: "#888", minWidth: 38, textAlign: "right" }}>
                            {w.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Models comparison card */}
        <div style={{
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6,
          padding: "28px 28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", marginBottom: 20 }}>
            Models evaluated
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {Object.entries(MODEL_META).map(([key, { label, color }]) => {
              const avg = stats?.byModel?.[key]?.avg || 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }}/>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{label}</span>
                    <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto" }}>avg {avg.toLocaleString()} words</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#666", lineHeight: 1.6, margin: 0 }}>
                    {key === "claude-sonnet-4-6"
                      ? "Anthropic's Claude Sonnet 4.5 — evaluated at temperature 0.0 across all therapy–question–language combinations."
                      : "OpenAI's GPT-5 (gpt-5.2) — evaluated under identical conditions for direct side-by-side comparison."}
                  </p>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f1f1" }}>
            <button
              onClick={() => navigate("/explorer")}
              style={{
                fontSize: 12, color: "#555", background: "none", border: "none",
                cursor: "pointer", padding: 0, fontFamily: "'Helvetica Neue', Arial, sans-serif",
                textDecoration: "underline", textUnderlineOffset: 3,
              }}
            >
              Read responses side by side →
            </button>
          </div>
        </div>

        {/* Study design card */}
        <div id="study" style={{
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6,
          padding: "28px 28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", marginBottom: 20 }}>
            Study design
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Prompting", val: "Temperature 0.0, 3 independent runs per condition" },
              { label: "Languages", val: "English and Spanish — all conditions bilingual" },
              { label: "Evaluation", val: "Clinician-derived rubric, automated LLM scoring (Gemini)" },
              { label: "Readability", val: "Flesch-Kincaid GL (EN), Fernández-Huerta (ES), SMOG" },
              { label: "Similarity", val: "Qwen3-Embedding cosine similarity EN↔ES" },
              { label: "Safety", val: "Item-level review for hallucination and omission" },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: 0.3, paddingTop: 1 }}>{label}</span>
                <span style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: "1px solid #e5e5e5", padding: "24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 12, color: "#bbb",
      }}>
        <span>KGR Lab · NIH Clinical Center · 2026</span>
        <span>Brenner, Toner, Kaushik, Lerner, Wood, Garcia-Reyes</span>
      </div>

    </div>
  );
}
