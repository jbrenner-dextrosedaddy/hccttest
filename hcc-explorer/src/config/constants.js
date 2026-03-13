// config/constants.js
// UI-only constants: colors, labels, axis definitions.
// Nothing here should duplicate or re-state what lives in responses.json.

// Keys must exactly match the `model` field in responses.json
export const MODEL_META = {
  "claude-sonnet-4-6": { label: "Claude", color: "#7c4dff" },
  "gpt-5.2":           { label: "GPT",    color: "#10a37f" },
};

// Keys must exactly match the `therapy` field in responses.json
export const THERAPY_COLOR = {
  General: "#1a73e8",
  RFA:     "#0f9d58",
  MWA:     "#f59300",
  TACE:    "#db4437",
  TARE:    "#ab47bc",
  Y90:     "#00acc1",
};

// Keys must exactly match the `language` field in responses.json
export const LANG_COLOR = {
  English: "#1a73e8",
  Spanish: "#e8710a",
};

// The four dimensions the axis configurator can assign to rows/cols.
// `id` values must match field names on the flat record object.
// NOTE: the prototype used "run" — this is renamed to "repetition" to match
// the actual field name in responses.json (integer: 1 | 2 | 3).
export const ALL_DIMS = [
  { id: "therapy",    label: "Therapy"    },
  { id: "language",   label: "Language"   },
  { id: "model",      label: "Model"      },
  { id: "repetition", label: "Repetition" },
];

// Fixed sets that don't need to be derived from data
export const ALL_LANGUAGES  = ["English", "Spanish"];
export const ALL_REPETITIONS = [1, 2, 3];

// ── Helpers used in rendering ───────────────────────────────────────────────

export function dimColor(dim, val) {
  if (dim === "therapy")  return THERAPY_COLOR[val] || "#111";
  if (dim === "language") return LANG_COLOR[val]    || "#111";
  if (dim === "model")    return MODEL_META[val]?.color || "#111";
  return "#111";
}

export function dimLabel(dim, val) {
  if (dim === "model")      return MODEL_META[val]?.label || val;
  if (dim === "repetition") return `Rep ${val}`;
  return String(val);
}
