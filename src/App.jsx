// App.jsx
import { useResponses } from "./hooks/useResponses";
import HCCExplorer from "./components/HCCExplorer";

export default function App() {
  const { data, loading, error } = useResponses();

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: 15, color: "#8d8d8d", letterSpacing: 0.2,
    }}>
      Loading responses…
    </div>
  );

  if (error) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh",
      fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#111",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
        Failed to load data
      </div>
      <div style={{ fontSize: 13, color: "#db4437", fontFamily: "monospace" }}>
        {error}
      </div>
      <div style={{ fontSize: 13, color: "#8d8d8d", marginTop: 8 }}>
        Make sure <code>/data/responses.json</code> is being served from the public directory.
      </div>
    </div>
  );

  return <HCCExplorer data={data} />;
}
