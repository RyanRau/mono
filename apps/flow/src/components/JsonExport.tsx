import { useState } from "react";
import { colors } from "../styles";

interface JsonExportProps {
  json: string;
  onClose: () => void;
}

export function JsonExport({ json, onClose }: JsonExportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flow.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          width: "min(700px, 90vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>
            Flow JSON
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                padding: "6px 14px",
                background: copied ? colors.success : colors.surface2,
                border: `1px solid ${colors.border}`,
                borderRadius: 5,
                color: colors.text,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                transition: "background 0.2s",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              style={{
                padding: "6px 14px",
                background: colors.primary,
                border: "none",
                borderRadius: 5,
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Download
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "6px 10px",
                background: "none",
                border: "none",
                color: colors.textMuted,
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* JSON content */}
        <pre
          style={{
            margin: 0,
            padding: 20,
            overflowY: "auto",
            fontSize: 12,
            fontFamily: "monospace",
            color: colors.text,
            lineHeight: 1.6,
            background: colors.bg,
            borderRadius: "0 0 10px 10px",
          }}
        >
          {json}
        </pre>
      </div>
    </div>
  );
}
