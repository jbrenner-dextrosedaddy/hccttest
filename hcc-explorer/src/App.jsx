// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useResponses } from "./hooks/useResponses";
import HCCExplorer from "./components/HCCExplorer";
import HomePage from "./components/HomePage";

function LoadingScreen() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: 15, color: "#8d8d8d", letterSpacing: 0.2,
    }}>
      Loading responses…
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh",
      fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#111",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Failed to load data</div>
      <div style={{ fontSize: 13, color: "#db4437", fontFamily: "monospace" }}>{error}</div>
      <div style={{ fontSize: 13, color: "#8d8d8d", marginTop: 8 }}>
        Make sure <code>/data/responses.json</code> is served from the public directory.
      </div>
    </div>
  );
}

export default function App() {
  const { data, loading, error } = useResponses();

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen error={error} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<HomePage data={data} />} />
        <Route path="/explorer" element={<HCCExplorer data={data} />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
