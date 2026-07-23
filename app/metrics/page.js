"use client";

import { useState, useEffect } from "react";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8CE7A";

export default function MetricsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <Wrapper>Loading...</Wrapper>;
  if (error) return <Wrapper>Error: {error}</Wrapper>;

  return (
    <Wrapper>
      <h1 style={{ color: GOLD_LIGHT, fontSize: 26, marginBottom: 4 }}>StealHaus Metrics</h1>
      <p style={{ color: "#999", marginTop: 0, marginBottom: 32 }}>Private - not linked from the public site</p>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Total clicks (all time)" value={data.totalClicks} />
        <StatCard label="Clicks (last 7 days)" value={data.last7Days} />
        <StatCard label="Live products" value={data.totalProducts} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        <ListCard title="Top clicked items" items={data.topProducts.map((p) => ({ label: p.name, count: p.count }))} />
        <ListCard title="Top brands" items={data.topBrands.map((b) => ({ label: b.name, count: b.count }))} />
        <ListCard title="Top retailers" items={data.topRetailers.map((r) => ({ label: r.name, count: r.count }))} />
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, color: GOLD_LIGHT }}>Most recent clicks</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.recentClicks.map((c, i) => (
            <div key={i} style={{ fontSize: 13, color: "#ccc", background: "#1a1a1a", padding: "8px 12px", borderRadius: 6 }}>
              <strong style={{ color: GOLD_LIGHT }}>{c.products?.brands?.name}</strong> — {c.products?.name}
              <span style={{ color: "#666", marginLeft: 8 }}>
                {new Date(c.clicked_at).toLocaleString("en-GB")}
              </span>
            </div>
          ))}
          {data.recentClicks.length === 0 && <p style={{ color: "#666" }}>No clicks logged yet.</p>}
        </div>
      </div>
    </Wrapper>
  );
}

function Wrapper({ children }) {
  return (
    <main style={{ minHeight: "100vh", background: "#0d0d0d", color: "#f5f5f5", fontFamily: "system-ui, sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>{children}</div>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "16px 24px", minWidth: 160 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#999" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, color: GOLD, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function ListCard({ title, items }) {
  return (
    <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 20 }}>
      <h2 style={{ fontSize: 14, color: GOLD_LIGHT, marginTop: 0 }}>{title}</h2>
      {items.length === 0 && <p style={{ color: "#666", fontSize: 13 }}>No data yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#ddd" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
              {i + 1}. {item.label}
            </span>
            <span style={{ color: GOLD_LIGHT, fontWeight: 600 }}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
