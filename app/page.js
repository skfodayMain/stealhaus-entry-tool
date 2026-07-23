"use client";

import { useState, useEffect } from "react";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8CE7A";

// Maps a product URL's domain to your confirmed Retailer name,
// so it doesn't need to be typed in by hand every time.
const RETAILER_DOMAINS = {
  "net-a-porter.com": "Net-a-Porter",
  "mrporter.com": "Mr Porter",
  "farfetch.com": "Farfetch",
  "mytheresa.com": "Mytheresa",
  "ssense.com": "SSENSE",
  "selfridges.com": "Selfridges",
  "harrods.com": "Harrods",
  "theoutnet.com": "The Outnet",
  "endclothing.com": "End Clothing",
  "brownsfashion.com": "Browns Fashion",
  "ln-cc.com": "LN-CC",
  "coggles.com": "Coggles",
  "flannels.com": "Flannels",
  "harveynichols.com": "Harvey Nichols",
  "wolfandbadger.com": "Wolf & Badger",
};

function detectRetailer(url) {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    for (const domain in RETAILER_DOMAINS) {
      if (hostname.includes(domain)) return RETAILER_DOMAINS[domain];
    }
  } catch (e) {
    // invalid URL - just leave retailer blank, user fills it in
  }
  return "";
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [pageText, setPageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [recent, setRecent] = useState([]);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    loadRecent();
  }, []);

  async function loadRecent() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.recent) setRecent(data.recent);
    } catch (e) {
      // silent fail on recent list - not critical
    }
  }

  async function handleExtract() {
    setError("");
    setSavedMsg("");
    setDuplicateWarning(null);
    setForm(null);
    if (!url.trim()) {
      setError("Paste a product link first.");
      return;
    }
    if (!pageText.trim() || pageText.trim().length < 50) {
      setError("Paste the page content into the box below the link too (select all on the product page, copy, then paste it in).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, pageText }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setForm({ retailer: detectRetailer(url), ...data.extracted, product_url: data.product_url });
      }
    } catch (e) {
      setError("Something went wrong. Check the link and pasted content and try again.");
    }
    setLoading(false);
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(force = false) {
    setError("");
    setSavedMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, force }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.duplicate) {
        setDuplicateWarning(data.matches);
      } else if (data.saved) {
        setSavedMsg("Saved to your database.");
        setForm(null);
        setUrl("");
        setPageText("");
        setDuplicateWarning(null);
        loadRecent();
      }
    } catch (e) {
      setError("Could not save. Check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px", color: "#f5f5f5" }}>
      <h1 style={{ color: GOLD_LIGHT, fontSize: 26, marginBottom: 4 }}>StealHaus</h1>
      <p style={{ color: "#aaa", marginTop: 0, marginBottom: 32 }}>Product entry tool</p>

      {/* Paste link section */}
      <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, color: "#ccc" }}>
          Product page link
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.net-a-porter.com/..."
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #333",
              background: "#0d0d0d",
              color: "#fff",
            }}
          />
          <button
            onClick={handleExtract}
            disabled={loading}
            style={{
              padding: "10px 18px",
              borderRadius: 6,
              border: "none",
              background: GOLD,
              color: "#111",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Working..." : "Get details"}
          </button>
        </div>
        {error && <p style={{ color: "#ff8080", marginTop: 12 }}>{error}</p>}

        <label style={{ display: "block", marginTop: 16, marginBottom: 8, fontSize: 14, color: "#ccc" }}>
          Page content (open the link above in your browser, press Cmd+A then Cmd+C to copy the whole page, then paste it here)
        </label>
        <textarea
          value={pageText}
          onChange={(e) => setPageText(e.target.value)}
          placeholder="Paste the copied page content here..."
          rows={6}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid #333",
            background: "#0d0d0d",
            color: "#fff",
            boxSizing: "border-box",
            fontFamily: "inherit",
            fontSize: 13,
            resize: "vertical",
          }}
        />
      </div>

      {/* Review / edit form */}
      {form && (
        <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, color: GOLD_LIGHT, marginTop: 0 }}>Review before saving</h2>
          <p style={{ color: "#999", fontSize: 13, marginTop: -8 }}>
            Check every field. Claude's read of the page can be wrong — fix anything before saving.
          </p>

          <Field label="Brand" value={form.brand} onChange={(v) => updateField("brand", v)} />
          <Field
            label="Retailer (must match your Retailers table exactly)"
            value={form.retailer}
            onChange={(v) => updateField("retailer", v)}
            placeholder="e.g. Net-a-Porter"
            highlight={!form.retailer}
          />
          <Field label="Product name" value={form.product_name} onChange={(v) => updateField("product_name", v)} />
          <Field label="Description" value={form.description} onChange={(v) => updateField("description", v)} />
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Category" value={form.category} onChange={(v) => updateField("category", v)} />
            <Field label="Gender" value={form.gender} onChange={(v) => updateField("gender", v)} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Original price" value={form.original_price} onChange={(v) => updateField("original_price", v)} />
            <Field label="Sale price" value={form.sale_price} onChange={(v) => updateField("sale_price", v)} />
            <Field label="Currency" value={form.currency} onChange={(v) => updateField("currency", v)} />
          </div>
          <Field label="Sizes available (comma separated)" value={form.sizes_available} onChange={(v) => updateField("sizes_available", v)} />
          <Field
            label="Image URL - right-click the main product photo on the page → 'Copy Image Address' → paste it here (this can't be auto-filled from pasted text)"
            value={form.image_url}
            onChange={(v) => updateField("image_url", v)}
            highlight={!form.image_url}
          />
          <Field label="Stock status" value={form.stock_status} onChange={(v) => updateField("stock_status", v)} />
          <Field label="Style tags (comma separated)" value={form.style_tags} onChange={(v) => updateField("style_tags", v)} />

          {duplicateWarning && (
            <div style={{ background: "#3a2a10", border: `1px solid ${GOLD}`, borderRadius: 6, padding: 12, marginTop: 12 }}>
              <p style={{ margin: 0, color: GOLD_LIGHT, fontWeight: 600 }}>Possible duplicate found</p>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#ddd", fontSize: 13 }}>
                {duplicateWarning.map((m) => (
                  <li key={m.id}>{m.name}</li>
                ))}
              </ul>
              <button
                onClick={() => handleSave(true)}
                style={{ marginTop: 10, padding: "6px 12px", borderRadius: 6, border: "1px solid #666", background: "transparent", color: "#fff", cursor: "pointer" }}
              >
                Save anyway
              </button>
            </div>
          )}

          {!duplicateWarning && (
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              style={{
                marginTop: 12,
                padding: "10px 20px",
                borderRadius: 6,
                border: "none",
                background: GOLD,
                color: "#111",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {loading ? "Saving..." : "Save to database"}
            </button>
          )}
        </div>
      )}

      {savedMsg && <p style={{ color: "#8fd88f" }}>{savedMsg}</p>}

      {/* Recent 5 */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 16, color: GOLD_LIGHT }}>Last 5 items added</h2>
        {recent.length === 0 && <p style={{ color: "#777" }}>Nothing added yet.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recent.map((item) => (
            <div key={item.id} style={{ background: "#1a1a1a", borderRadius: 8, padding: 12, fontSize: 14 }}>
              <strong style={{ color: GOLD_LIGHT }}>{item.brands?.name}</strong> — {item.name}
              <div style={{ color: "#999", fontSize: 12, marginTop: 4 }}>
                {item.retailers?.name} · {item.currency} {item.current_price} · {item.stock_status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, highlight }) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <label style={{ display: "block", fontSize: 12, color: highlight ? "#ffb347" : "#999", marginBottom: 4 }}>{label}</label>
      <input
        type="text"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 6,
          border: highlight ? "1px solid #ffb347" : "1px solid #333",
          background: "#0d0d0d",
          color: "#fff",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
