"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n, AVAILABLE_LOCALES, type Locale } from "../lib/i18n/index.js";

export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = AVAILABLE_LOCALES.find((l) => l.code === locale);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "5px 10px",
          color: "var(--text)",
          font: "600 9px var(--font-geist-mono)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "13px" }}>{current?.flag}</span>
        <span style={{ letterSpacing: ".04em" }}>{current?.name}</span>
        <span style={{ fontSize: "7px", color: "var(--muted)" }}>▼</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "4px",
            background: "#0c1318",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 0",
            minWidth: "200px",
            zIndex: 100,
            boxShadow: "0 12px 40px #000a",
            maxHeight: "360px",
            overflowY: "auto",
          }}
        >
          {AVAILABLE_LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code as Locale);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "8px 14px",
                border: "none",
                background: l.code === locale ? "#10262d" : "transparent",
                color: l.code === locale ? "var(--cyan)" : "var(--text)",
                font: "500 10px var(--font-geist-mono)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (l.code !== locale) e.currentTarget.style.background = "#10262d";
              }}
              onMouseLeave={(e) => {
                if (l.code !== locale) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: "16px" }}>{l.flag}</span>
              <span style={{ flex: 1 }}>{l.name}</span>
              {l.code === locale && (
                <span style={{ color: "var(--cyan)", fontSize: "11px" }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
