"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8CE7A";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [gender, setGender] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRetailers, setSelectedRetailers] = useState([]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("*, brands(name), retailers(name)")
      .eq("still_in_feed", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  // Build filter option lists from whatever's actually in the data
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set(products.map((p) => p.brands?.name).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const retailers = useMemo(() => {
    const set = new Set(products.map((p) => p.retailers?.name).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brands?.name)) return false;
      if (selectedRetailers.length > 0 && !selectedRetailers.includes(p.retailers?.name)) return false;
      if (gender !== "All" && p.gender !== gender.toLowerCase()) return false;
      if (inStockOnly && p.stock_status === "out_of_stock") return false;
      if (minDiscount > 0 && (p.discount_percentage || 0) < minDiscount) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${p.brands?.name || ""} ${p.name || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === "discount") {
      result = [...result].sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    } else if (sortBy === "price_low") {
      result = [...result].sort((a, b) => (a.current_price || 0) - (b.current_price || 0));
    } else if (sortBy === "price_high") {
      result = [...result].sort((a, b) => (b.current_price || 0) - (a.current_price || 0));
    }
    // "newest" is already the default order from the query

    return result;
  }, [products, category, selectedBrands, selectedRetailers, gender, inStockOnly, minDiscount, search, sortBy]);

  function toggleBrand(name) {
    setSelectedBrands((prev) =>
      prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]
    );
  }

  function toggleRetailer(name) {
    setSelectedRetailers((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  }

  async function logClick(productId) {
    // Fire-and-forget - don't block or slow down the user clicking through
    try {
      await supabase.from("product_clicks").insert([{ product_id: productId }]);
    } catch (e) {
      // Fail silently - a missed click log should never stop someone shopping
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d0d", color: "#f5f5f5", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "32px 20px 16px", borderBottom: "1px solid #222" }}>
        <img src="/logo.png" alt="StealHaus" style={{ height: 48, marginBottom: 4 }} />
        <p style={{ color: "#999", margin: "4px 0 20px" }}>Shop the Edit</p>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by brand or item..."
          style={{
            width: "100%",
            maxWidth: 480,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#1a1a1a",
            color: "#fff",
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />

        {/* Category chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${category === c ? GOLD : "#333"}`,
                background: category === c ? GOLD : "transparent",
                color: category === c ? "#111" : "#ccc",
                fontSize: 13,
                fontWeight: category === c ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Gender + sort + more filters row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, alignItems: "center" }}>
          {["All", "Women", "Men", "Unisex"].map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: `1px solid ${gender === g ? GOLD_LIGHT : "#333"}`,
                background: "transparent",
                color: gender === g ? GOLD_LIGHT : "#999",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {g}
            </button>
          ))}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #333",
              background: "#1a1a1a",
              color: "#ccc",
              fontSize: 12,
              marginLeft: "auto",
            }}
          >
            <option value="newest">Newest</option>
            <option value="discount">Biggest discount</option>
            <option value="price_low">Price: low to high</option>
            <option value="price_high">Price: high to low</option>
          </select>

          <button
            onClick={() => setShowFilters((s) => !s)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #333",
              background: showFilters ? "#1a1a1a" : "transparent",
              color: "#ccc",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Filters {showFilters ? "▲" : "▼"}
          </button>
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div style={{ marginTop: 16, padding: 16, background: "#1a1a1a", borderRadius: 8, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: "#999", margin: "0 0 8px" }}>Brand</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => toggleBrand(b)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 14,
                      border: `1px solid ${selectedBrands.includes(b) ? GOLD : "#333"}`,
                      background: selectedBrands.includes(b) ? GOLD : "transparent",
                      color: selectedBrands.includes(b) ? "#111" : "#ccc",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, color: "#999", margin: "0 0 8px" }}>Retailer</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {retailers.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleRetailer(r)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 14,
                      border: `1px solid ${selectedRetailers.includes(r) ? GOLD : "#333"}`,
                      background: selectedRetailers.includes(r) ? GOLD : "transparent",
                      color: selectedRetailers.includes(r) ? "#111" : "#ccc",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 12, color: "#999", margin: "0 0 8px" }}>Minimum discount</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {[0, 30, 50, 70].map((d) => (
                    <button
                      key={d}
                      onClick={() => setMinDiscount(d)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 14,
                        border: `1px solid ${minDiscount === d ? GOLD : "#333"}`,
                        background: minDiscount === d ? GOLD : "transparent",
                        color: minDiscount === d ? "#111" : "#ccc",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {d === 0 ? "Any" : `${d}%+`}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ccc", cursor: "pointer" }}>
                <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                In stock only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div style={{ padding: "16px 20px 0", fontSize: 13, color: "#777" }}>
        {loading ? "Loading..." : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`}
      </div>

      {error && <p style={{ padding: "0 20px", color: "#ff8080" }}>{error}</p>}

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 20,
          padding: 20,
        }}
      >
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onClickItem={logClick} />
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#666", padding: 60 }}>
          Nothing matches those filters yet — try widening your search.
        </p>
      )}
    </main>
  );
}

function ProductCard({ product, onClickItem }) {
  const discount = product.discount_percentage;
  const link = product.affiliate_url || product.product_url;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onClickItem && onClickItem(product.id)}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div style={{ position: "relative", background: "#1a1a1a", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ position: "relative", aspectRatio: "3/4", background: "#111" }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#444", fontSize: 12 }}>
              No image
            </div>
          )}

          {discount ? (
            <span
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: GOLD,
                color: "#111",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              -{discount}%
            </span>
          ) : null}

          {product.stock_status === "low_stock" && (
            <span
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                background: "rgba(0,0,0,0.75)",
                color: GOLD_LIGHT,
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              Low stock
            </span>
          )}
          {product.stock_status === "out_of_stock" && (
            <span
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                background: "rgba(0,0,0,0.75)",
                color: "#999",
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              Sold out
            </span>
          )}
        </div>

        <div style={{ padding: "10px 12px 14px" }}>
          <p style={{ margin: 0, fontSize: 12, color: GOLD_LIGHT, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {product.brands?.name}
          </p>
          <p
            style={{
              margin: "2px 0 8px",
              fontSize: 13,
              color: "#ddd",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.name}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            {product.original_price && product.original_price !== product.current_price && (
              <span style={{ fontSize: 12, color: "#777", textDecoration: "line-through" }}>
                {product.currency} {product.original_price}
              </span>
            )}
            <span style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>
              {product.currency} {product.current_price}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#666" }}>{product.retailers?.name}</p>
        </div>
      </div>
    </a>
  );
}
